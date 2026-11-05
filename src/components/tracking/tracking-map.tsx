"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

type TrackPoint = {
  id: string;
  zone: "WATCH" | "VIOLATION" | "OUTSIDE";
  victim: { latitude: number; longitude: number };
  inmate: { latitude: number; longitude: number };
};

function pathColor(zone: TrackPoint["zone"]) {
  if (zone === "VIOLATION") return "#C62828";
  if (zone === "OUTSIDE") return "#6B7280";
  return "#C47E00";
}

type LatLng = { latitude: number; longitude: number };

type TrackingMapProps = {
  points: TrackPoint[];
  selectedId: string | null;
  playing?: boolean;
  speed?: number;
  onCheckpoint?: (id: string) => void;
  onPlaybackEnd?: () => void;
};

const SEGMENT_MS = 1400;

function mix(from: LatLng, to: LatLng, t: number): [number, number] {
  return [
    from.latitude + (to.latitude - from.latitude) * t,
    from.longitude + (to.longitude - from.longitude) * t,
  ];
}

function dot(color: string) {
  return `<span style="display:block;width:14px;height:14px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></span>`;
}

export function TrackingMap({
  points,
  selectedId,
  playing = false,
  speed = 1,
  onCheckpoint,
  onPlaybackEnd,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);
  const fittedKeyRef = useRef("");
  const [mapReady, setMapReady] = useState(false);
  const playingRef = useRef(playing);
  const selectedIdRef = useRef(selectedId);
  const speedRef = useRef(speed);
  const onCheckpointRef = useRef(onCheckpoint);
  const onPlaybackEndRef = useRef(onPlaybackEnd);
  playingRef.current = playing;
  selectedIdRef.current = selectedId;
  speedRef.current = speed;
  onCheckpointRef.current = onCheckpoint;
  onPlaybackEndRef.current = onPlaybackEnd;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([-16.6869, -49.2648], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      layersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!mapReady || !map || !layers || playing) return;

    void import("leaflet").then(({ default: L }) => {
      if (playingRef.current) return;
      layers.clearLayers();
      const bounds: [number, number][] = [];
      const selected =
        points.find((point) => point.id === selectedId) ??
        points[points.length - 1] ??
        null;

      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const color = pathColor(current.zone);
        L.polyline(
          [
            [previous.inmate.latitude, previous.inmate.longitude],
            [current.inmate.latitude, current.inmate.longitude],
          ],
          { color, weight: 3, opacity: 0.9 },
        ).addTo(layers);
        L.polyline(
          [
            [previous.victim.latitude, previous.victim.longitude],
            [current.victim.latitude, current.victim.longitude],
          ],
          { color: "#2563EB", weight: 2, opacity: 0.45 },
        ).addTo(layers);
      }

      if (selected) {
        const victim: [number, number] = [
          selected.victim.latitude,
          selected.victim.longitude,
        ];
        const inmate: [number, number] = [
          selected.inmate.latitude,
          selected.inmate.longitude,
        ];
        const inmateColor = pathColor(selected.zone);
        L.marker(victim, {
          icon: L.divIcon({
            className: "",
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            html: dot("#2563EB"),
          }),
        })
          .addTo(layers)
          .bindTooltip("Vítima", { direction: "top" });
        L.marker(inmate, {
          icon: L.divIcon({
            className: "",
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            html: dot(inmateColor),
          }),
        })
          .addTo(layers)
          .bindTooltip("Preso", { direction: "top" });
      }

      for (const point of points) {
        bounds.push(
          [point.victim.latitude, point.victim.longitude],
          [point.inmate.latitude, point.inmate.longitude],
        );
      }

      const fitKey = points.map((point) => point.id).join(",");
      if (bounds.length > 0 && fittedKeyRef.current !== fitKey) {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
        fittedKeyRef.current = fitKey;
      } else if (selected) {
        map.panTo([selected.inmate.latitude, selected.inmate.longitude]);
      }
      window.setTimeout(() => map.invalidateSize(), 60);
    });
  }, [points, selectedId, mapReady, playing]);

  useEffect(() => {
    if (!mapReady || !playing || points.length < 2) {
      if (playing && points.length < 2) onPlaybackEndRef.current?.();
      return;
    }

    const layers = layersRef.current;
    if (!layers) return;

    let cancelled = false;
    let frame = 0;

    void import("leaflet").then(({ default: L }) => {
      if (cancelled) return;
      layers.clearLayers();

      const found = points.findIndex((point) => point.id === selectedIdRef.current);
      let index = found < 0 || found >= points.length - 1 ? 0 : found;
      let progress = 0;
      let lastNow = performance.now();

      const done = L.layerGroup().addTo(layers);
      const inmateMarker = L.marker(mix(points[index].inmate, points[index].inmate, 0), {
        icon: L.divIcon({
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          html: dot(pathColor(points[index].zone)),
        }),
      })
        .addTo(layers)
        .bindTooltip("Preso", { direction: "top" });
      const victimMarker = L.marker(mix(points[index].victim, points[index].victim, 0), {
        icon: L.divIcon({
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          html: dot("#2563EB"),
        }),
      })
        .addTo(layers)
        .bindTooltip("Vítima", { direction: "top" });
      const partialInmate = L.polyline([], { weight: 3, opacity: 0.9 }).addTo(layers);
      const partialVictim = L.polyline([], {
        color: "#2563EB",
        weight: 2,
        opacity: 0.45,
      }).addTo(layers);

      function drawDone(through: number) {
        done.clearLayers();
        for (let step = 1; step <= through; step += 1) {
          const previous = points[step - 1];
          const current = points[step];
          L.polyline(
            [
              [previous.inmate.latitude, previous.inmate.longitude],
              [current.inmate.latitude, current.inmate.longitude],
            ],
            { color: pathColor(current.zone), weight: 3, opacity: 0.9 },
          ).addTo(done);
          L.polyline(
            [
              [previous.victim.latitude, previous.victim.longitude],
              [current.victim.latitude, current.victim.longitude],
            ],
            { color: "#2563EB", weight: 2, opacity: 0.45 },
          ).addTo(done);
        }
      }

      function paintInmate(step: number) {
        const zone = points[step + 1]?.zone ?? points[step].zone;
        inmateMarker.setIcon(
          L.divIcon({
            className: "",
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            html: dot(pathColor(zone)),
          }),
        );
      }

      drawDone(index);
      paintInmate(index);
      onCheckpointRef.current?.(points[index].id);

      const tick = (now: number) => {
        if (cancelled) return;
        const from = points[index];
        const to = points[index + 1];
        if (!to) {
          onPlaybackEndRef.current?.();
          return;
        }

        const duration = SEGMENT_MS / Math.max(speedRef.current, 0.5);
        progress += (now - lastNow) / duration;
        lastNow = now;
        const t = Math.min(1, progress);
        const inmate = mix(from.inmate, to.inmate, t);
        const victim = mix(from.victim, to.victim, t);
        inmateMarker.setLatLng(inmate);
        victimMarker.setLatLng(victim);
        partialInmate.setStyle({ color: pathColor(to.zone) });
        partialInmate.setLatLngs([
          [from.inmate.latitude, from.inmate.longitude],
          inmate,
        ]);
        partialVictim.setLatLngs([
          [from.victim.latitude, from.victim.longitude],
          victim,
        ]);

        if (t < 1) {
          frame = window.requestAnimationFrame(tick);
          return;
        }

        drawDone(index + 1);
        partialInmate.setLatLngs([]);
        partialVictim.setLatLngs([]);
        onCheckpointRef.current?.(to.id);
        index += 1;
        if (index >= points.length - 1) {
          onPlaybackEndRef.current?.();
          return;
        }
        paintInmate(index);
        progress = 0;
        lastNow = now;
        frame = window.requestAnimationFrame(tick);
      };

      frame = window.requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [playing, mapReady, points]);

  return (
    <div ref={containerRef} className="tracking-map h-full w-full bg-[#E8EAED]" />
  );
}
