"use client";

import { useEffect, useRef } from "react";
import maplibregl, { LngLatBounds } from "maplibre-gl";

type LatLng = { lat: number; lng: number };

type LiveTrackingMapProps = {
  pickup: LatLng;
  drop: LatLng;
  rider: LatLng | null;
  route: Array<[number, number]>;
};

const osmStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

function createMarker(color: string, label: string) {
  const element = document.createElement("div");
  element.style.width = "26px";
  element.style.height = "26px";
  element.style.borderRadius = "9999px";
  element.style.border = "2px solid white";
  element.style.boxShadow = "0 8px 18px rgba(0,0,0,0.2)";
  element.style.background = color;
  element.style.display = "grid";
  element.style.placeItems = "center";
  element.style.color = "white";
  element.style.fontSize = "10px";
  element.style.fontWeight = "700";
  element.textContent = label;
  return element;
}

export default function LiveTrackingMap({ pickup, drop, rider, route }: LiveTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: osmStyle,
      center: [pickup.lng, pickup.lat],
      zoom: 12,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: route,
          },
          properties: {},
        },
      });

      map.addLayer({
        id: "route-line-shadow",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#0f172a",
          "line-width": 8,
          "line-opacity": 0.2,
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#0d9488",
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [pickup.lat, pickup.lng, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const render = () => {
      const source = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: route,
          },
          properties: {},
        });
      }

      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];

      markersRef.current.push(
        new maplibregl.Marker({ element: createMarker("#2563eb", "P") })
          .setLngLat([pickup.lng, pickup.lat])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setText("Pickup"))
          .addTo(map)
      );

      markersRef.current.push(
        new maplibregl.Marker({ element: createMarker("#16a34a", "D") })
          .setLngLat([drop.lng, drop.lat])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setText("Drop"))
          .addTo(map)
      );

      if (rider) {
        markersRef.current.push(
          new maplibregl.Marker({ element: createMarker("#f59e0b", "R") })
            .setLngLat([rider.lng, rider.lat])
            .setPopup(new maplibregl.Popup({ offset: 18 }).setText("Rider"))
            .addTo(map)
        );
      }

      const bounds = new LngLatBounds();
      bounds.extend([pickup.lng, pickup.lat]);
      bounds.extend([drop.lng, drop.lat]);
      if (rider) {
        bounds.extend([rider.lng, rider.lat]);
      }
      map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 900 });
    };

    if (map.loaded()) {
      render();
    } else {
      map.once("load", render);
    }
  }, [pickup, drop, rider, route]);

  return <div ref={mapContainerRef} className="h-[430px] w-full rounded-[26px] border border-slate-200" />;
}
