"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { OperationsTrack } from "@/types/operations";

const GOIANIA: [number, number] = [-16.6869, -49.2648];

type OperationsMapProps = {
  tracks: OperationsTrack[];
  selectedOrderId: string | null;
  onSelect: (orderId: string) => void;
};

function victimIcon(L: typeof import("leaflet"), active: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:#2563EB;border:2px solid #fff;box-shadow:0 0 0 ${active ? "3px rgba(37,99,235,.35)" : "1px rgba(0,0,0,.25)"}"></span>`,
  });
}

function inmateIcon(L: typeof import("leaflet"), violating: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:${violating ? "#C62828" : "#4B5563"};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></span>`,
  });
}

export function OperationsMap({
  tracks,
  selectedOrderId,
  onSelect,
}: OperationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);
  const fittedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(GOIANIA, 12);

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
    if (!mapReady || !map || !layers) return;

    void import("leaflet").then(({ default: L }) => {
      layers.clearLayers();
      const bounds: [number, number][] = [];

      for (const track of tracks) {
        const violating = track.geofenceState === "VIOLATING";
        const selected = track.orderId === selectedOrderId;

        if (track.victim.location) {
          const pos: [number, number] = [
            track.victim.location.latitude,
            track.victim.location.longitude,
          ];
          bounds.push(pos);
          L.marker(pos, { icon: victimIcon(L, selected || violating) })
            .addTo(layers)
            .bindTooltip(`Vítima · ${track.victim.name}`, { direction: "top" })
            .on("click", () => onSelectRef.current(track.orderId));

          L.circle(pos, {
            radius: track.radiusMeters,
            color: violating ? "#C62828" : "#16A34A",
            weight: selected || violating ? 2 : 1,
            fillColor: violating ? "#D4D4D4" : "#22C55E",
            fillOpacity: violating ? 0.22 : 0.08,
          }).addTo(layers);
        }

        if (track.inmate.location) {
          const pos: [number, number] = [
            track.inmate.location.latitude,
            track.inmate.location.longitude,
          ];
          bounds.push(pos);
          L.marker(pos, { icon: inmateIcon(L, violating) })
            .addTo(layers)
            .bindTooltip(`Preso · ${track.inmate.name}`, { direction: "top" })
            .on("click", () => onSelectRef.current(track.orderId));
        }
      }

      if (bounds.length > 0 && !fittedRef.current) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
        fittedRef.current = true;
      }
    });
  }, [tracks, selectedOrderId, mapReady]);

  return <div ref={containerRef} className="h-full w-full bg-[#E8EAED]" />;
}
