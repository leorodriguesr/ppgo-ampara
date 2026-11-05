"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Circle,
  CircleMarker,
  Layer,
  LayerGroup,
  Map as LeafletMap,
  Marker,
} from "leaflet";
import "leaflet/dist/leaflet.css";

import type { OperationsTrack } from "@/types/operations";

const GOIANIA: [number, number] = [-16.6869, -49.2648];

type MapPadding = {
  topLeft: [number, number];
  bottomRight: [number, number];
};

type OperationsMapProps = {
  tracks: OperationsTrack[];
  focusOrderId?: string | null;
  focusTick?: number;
  padding?: MapPadding;
  onSelect: (orderId: string) => void;
  onOpen?: (orderId: string) => void;
};

type DrawnTrack = {
  kind: OperationsTrack["zone"];
  layers: Layer[];
  victim: Marker | CircleMarker;
  inmate: Marker | null;
  watch: Circle | null;
  radius: Circle | null;
};

function victimIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:#2563EB;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></span>`,
  });
}

function inmateIcon(L: typeof import("leaflet"), zone: OperationsTrack["zone"]) {
  const color = zone === "violation" ? "#C62828" : "#D97706";
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></span>`,
  });
}

function openOnClick(layer: Layer, orderId: string, onSelect: (orderId: string) => void) {
  layer.on("click", () => onSelect(orderId));
}

function drawTrack(
  L: typeof import("leaflet"),
  group: LayerGroup,
  track: OperationsTrack,
  onSelect: (orderId: string) => void,
  onOpen: (orderId: string) => void,
): DrawnTrack | null {
  if (track.zone === "clear") return null;
  const victim = track.victim.location;
  if (!victim) return null;

  const victimPoint: [number, number] = [victim.latitude, victim.longitude];
  const inmate = track.inmate.location;
  const active = track.zone === "watch" || track.zone === "violation";
  const layers: Layer[] = [];

  let watch: Circle | null = null;
  if (track.zone === "watch") {
    watch = L.circle(victimPoint, {
      radius: track.watchRadiusMeters,
      color: "#E0A100",
      weight: 2,
      fillColor: "#F5D76E",
      fillOpacity: 0.08,
    }).addTo(group);
    openOnClick(watch, track.orderId, onOpen);
    layers.push(watch);
  }

  let radius: Circle | null = null;
  if (active) {
    radius = L.circle(victimPoint, {
      radius: track.radiusMeters,
      color: "#C62828",
      weight: 2,
      fillColor: "#C62828",
      fillOpacity: 0.06,
    }).addTo(group);
    openOnClick(radius, track.orderId, onOpen);
    layers.push(radius);
  }

  const marker: Marker = L.marker(victimPoint, { icon: victimIcon(L) }).addTo(group);
  marker.bindTooltip(track.victim.name, { direction: "top", offset: [0, -8] });
  openOnClick(marker, track.orderId, onSelect);
  layers.push(marker);

  let inmateMarker: Marker | null = null;
  if (active && inmate) {
    inmateMarker = L.marker([inmate.latitude, inmate.longitude], {
      icon: inmateIcon(L, track.zone),
    })
      .bindTooltip(track.inmate.name, { direction: "top", offset: [0, -8] })
      .addTo(group);
    openOnClick(inmateMarker, track.orderId, onSelect);
    layers.push(inmateMarker);
  }

  return {
    kind: track.zone,
    layers,
    victim: marker,
    inmate: inmateMarker,
    watch,
    radius,
  };
}

function moveTrack(L: typeof import("leaflet"), drawn: DrawnTrack, track: OperationsTrack) {
  const victim = track.victim.location;
  if (!victim) return;
  const victimPoint: [number, number] = [victim.latitude, victim.longitude];
  drawn.victim.setLatLng(victimPoint);
  if (track.zone !== "clear") {
    drawn.victim.setTooltipContent(track.victim.name);
  }
  drawn.watch?.setLatLng(victimPoint);
  drawn.watch?.setRadius(track.watchRadiusMeters);
  drawn.radius?.setLatLng(victimPoint);
  drawn.radius?.setRadius(track.radiusMeters);

  const inmate = track.inmate.location;
  if (drawn.inmate && inmate) {
    drawn.inmate.setLatLng([inmate.latitude, inmate.longitude]);
    drawn.inmate.setIcon(inmateIcon(L, track.zone));
    drawn.inmate.setTooltipContent(track.inmate.name);
  }
}

const DEFAULT_PADDING: MapPadding = {
  topLeft: [24, 88],
  bottomRight: [380, 36],
};

function trackPoints(track: OperationsTrack | undefined): [number, number][] {
  if (!track?.victim.location) return [];
  const points: [number, number][] = [
    [track.victim.location.latitude, track.victim.location.longitude],
  ];
  if (track.inmate.location) {
    points.push([
      track.inmate.location.latitude,
      track.inmate.location.longitude,
    ]);
  }
  return points;
}

export function OperationsMap({
  tracks,
  focusOrderId = null,
  focusTick = 0,
  padding = DEFAULT_PADDING,
  onSelect,
  onOpen,
}: OperationsMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupRef = useRef<LayerGroup | null>(null);
  const drawnRef = useRef<Map<string, DrawnTrack>>(new Map());
  const fittedRef = useRef("");
  const focusRequestRef = useRef("");
  const onSelectRef = useRef(onSelect);
  const onOpenRef = useRef(onOpen);
  const paddingRef = useRef(padding);
  const [mapReady, setMapReady] = useState(false);
  onSelectRef.current = onSelect;
  onOpenRef.current = onOpen;
  paddingRef.current = padding;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !hostRef.current || mapRef.current) return;
      const map = L.map(hostRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView(GOIANIA, 12);
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      groupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      groupRef.current = null;
      drawnRef.current.clear();
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    return () => window.cancelAnimationFrame(frame);
  }, [mapReady, focusTick]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group || !mapReady) return;
    const map = mapRef.current;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !groupRef.current || !mapRef.current) return;
      const seen = new Set<string>();
      const bounds: [number, number][] = [];

      for (const track of tracks) {
        const victim = track.victim.location;
        if (!victim) continue;
        seen.add(track.orderId);
        bounds.push([victim.latitude, victim.longitude]);
        if (track.inmate.location) {
          bounds.push([
            track.inmate.location.latitude,
            track.inmate.location.longitude,
          ]);
        }

        const current = drawnRef.current.get(track.orderId);
        if (current && current.kind !== track.zone) {
          for (const layer of current.layers) layer.remove();
          drawnRef.current.delete(track.orderId);
        }

        const drawn = drawnRef.current.get(track.orderId);
        if (!drawn) {
          const created = drawTrack(
            L,
            group,
            track,
            (orderId) => onSelectRef.current(orderId),
            (orderId) => (onOpenRef.current ?? onSelectRef.current)(orderId),
          );
          if (created) drawnRef.current.set(track.orderId, created);
        } else {
          moveTrack(L, drawn, track);
        }
      }

      for (const [orderId, drawn] of drawnRef.current) {
        if (seen.has(orderId)) continue;
        for (const layer of drawn.layers) layer.remove();
        drawnRef.current.delete(orderId);
      }

      if (!map) return;
      const pad = paddingRef.current;
      const focusKey = focusOrderId ? `${focusOrderId}:${focusTick}` : "";
      if (focusOrderId && focusRequestRef.current !== focusKey) {
        const points = trackPoints(
          tracks.find((track) => track.orderId === focusOrderId),
        );
        if (points.length > 0) {
          focusRequestRef.current = focusKey;
          map.fitBounds(points, {
            paddingTopLeft: pad.topLeft,
            paddingBottomRight: pad.bottomRight,
            maxZoom: 16,
          });
        }
      } else if (!focusOrderId) {
        const fitKey = `all:${focusTick}:${[...seen].sort().join(",")}`;
        if (bounds.length > 0 && fittedRef.current !== fitKey) {
          fittedRef.current = fitKey;
          map.fitBounds(bounds, {
            paddingTopLeft: pad.topLeft,
            paddingBottomRight: pad.bottomRight,
            maxZoom: 14,
          });
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tracks, mapReady, focusOrderId, focusTick]);

  return (
    <div className="operations-map relative h-full w-full">
      <div ref={hostRef} className="h-full w-full" />
      <style>{`
        .operations-map .leaflet-interactive {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
