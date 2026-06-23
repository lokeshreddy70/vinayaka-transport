"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import LiveTrackingMap from "../components/LiveTrackingMap";

type TrackingEvent = {
  id: string;
  status: string;
  message: string;
  location_label: string | null;
  event_time: string;
  latitude: number | null;
  longitude: number | null;
};

type TrackingResult = {
  booking: {
    id: string;
    tracking_id: string;
    sender_name: string;
    receiver_name: string;
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    drop_address: string;
    drop_lat: number;
    drop_lng: number;
    status: string;
    estimated_arrival_at: string | null;
    trips: Array<{
      id: string;
      status: string;
      drivers?: {
        id: string;
        current_lat: number | null;
        current_lng: number | null;
        users?: {
          full_name: string;
          phone: string | null;
        };
      };
      vehicles?: {
        registration_no: string;
        model_name: string | null;
      };
    }>;
    delivery_proofs: Array<{
      id: string;
      photo_url: string | null;
      signature_url: string | null;
      note: string | null;
    }>;
  };
  timeline: TrackingEvent[];
};

type ConnectionState = "idle" | "live" | "reconnecting";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://vinayaka-transport-api.vercel.app/api/v1";
const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY ?? "";

const STATUS_LABELS: Record<string, string> = {
  assigned: "Rider Assigned",
  started: "Rider Started",
  pickup_complete: "Order Picked Up",
  in_transit: "On The Way",
  delivered: "Delivered",
  rejected: "Rider Rejected",
  booked: "Booking Confirmed",
};

function toStatusLabel(status: string) {
  const normalized = status.toLowerCase().trim();
  if (normalized === "reached_pickup") {
    return "Rider Reached Pickup";
  }
  if (normalized === "reached_destination") {
    return "Reached Destination";
  }
  return STATUS_LABELS[normalized] ?? status.replaceAll("_", " ");
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

async function fetchRouteCoordinates(
  pickup: { lat: number; lng: number },
  drop: { lat: number; lng: number }
): Promise<Array<[number, number]>> {
  if (!ORS_API_KEY) {
    return [
      [pickup.lng, pickup.lat],
      [drop.lng, drop.lat],
    ];
  }

  try {
    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        Authorization: ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [pickup.lng, pickup.lat],
          [drop.lng, drop.lat],
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to fetch route");
    }

    const data = await response.json();
    const coordinates = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error("Invalid route response");
    }

    return coordinates as Array<[number, number]>;
  } catch {
    return [
      [pickup.lng, pickup.lat],
      [drop.lng, drop.lat],
    ];
  }
}

export default function TrackingPortalPage() {
  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<[number, number]>>([]);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function fetchTrackingData(id: string): Promise<TrackingResult> {
    const response = await fetch(`${API_URL}/tracking/${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Tracking failed");
    }
    return data as TrackingResult;
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!trackingId.trim()) {
      setError("Enter a tracking id");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const next = await fetchTrackingData(trackingId.trim());
      setResult(next);
      setConnection("live");
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : "Unable to track booking";
      if (message.toLowerCase().includes("failed to fetch")) {
        message = "Unable to reach tracking service. Please check connection and try again.";
      }
      setError(message);
      setResult(null);
      setConnection("idle");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!result?.booking.tracking_id) {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        const latest = await fetchTrackingData(result.booking.tracking_id);
        if (cancelled) {
          return;
        }
        setResult(latest);
        setConnection("live");
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        if (!cancelled) {
          setConnection("reconnecting");
        }
      }
    };

    const timer = setInterval(() => {
      void sync();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [result?.booking.tracking_id]);

  const pickup = useMemo(() => {
    if (!result) {
      return null;
    }
    return {
      lat: Number(result.booking.pickup_lat),
      lng: Number(result.booking.pickup_lng),
    };
  }, [result]);

  const drop = useMemo(() => {
    if (!result) {
      return null;
    }
    return {
      lat: Number(result.booking.drop_lat),
      lng: Number(result.booking.drop_lng),
    };
  }, [result]);

  const riderLocation = useMemo(() => {
    const activeTrip = result?.booking.trips?.[0];
    const lat = activeTrip?.drivers?.current_lat;
    const lng = activeTrip?.drivers?.current_lng;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return null;
    }
    return { lat, lng };
  }, [result]);

  useEffect(() => {
    if (!pickup || !drop) {
      setRouteCoordinates([]);
      return;
    }

    let cancelled = false;

    const build = async () => {
      const coordinates = await fetchRouteCoordinates(pickup, drop);
      if (!cancelled) {
        setRouteCoordinates(coordinates);
      }
    };

    void build();

    return () => {
      cancelled = true;
    };
  }, [pickup, drop]);

  const activeTrip = result?.booking.trips?.[0];
  const driverName = activeTrip?.drivers?.users?.full_name ?? "Not assigned";
  const driverPhone = activeTrip?.drivers?.users?.phone ?? "-";
  const vehicle = activeTrip?.vehicles
    ? `${activeTrip.vehicles.registration_no}${activeTrip.vehicles.model_name ? ` (${activeTrip.vehicles.model_name})` : ""}`
    : "Not assigned";

  const liveDistanceKm = useMemo(() => {
    if (!drop) {
      return null;
    }
    if (riderLocation) {
      return haversineKm(riderLocation.lat, riderLocation.lng, drop.lat, drop.lng);
    }
    if (pickup) {
      return haversineKm(pickup.lat, pickup.lng, drop.lat, drop.lng);
    }
    return null;
  }, [pickup, drop, riderLocation]);

  const etaText = useMemo(() => {
    if (result?.booking.estimated_arrival_at) {
      return new Date(result.booking.estimated_arrival_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (liveDistanceKm == null) {
      return "Calculating...";
    }
    const minutes = Math.max(2, Math.round((liveDistanceKm / 30) * 60));
    return `${minutes} min`;
  }, [result, liveDistanceKm]);

  async function shareTracking() {
    const id = result?.booking.tracking_id;
    if (!id) {
      return;
    }

    const trackUrl = `${window.location.origin}?tracking=${encodeURIComponent(id)}`;

    if (navigator.share) {
      await navigator.share({
        title: `Vinayaka Tracking - ${id}`,
        text: `Track shipment ${id} live`,
        url: trackUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(trackUrl);
    setError("Tracking link copied to clipboard.");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[36px] border border-white/80 bg-white/80 p-5 shadow-[0_30px_90px_-40px_rgba(13,43,82,0.45)] backdrop-blur sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] bg-[linear-gradient(135deg,#0d2b52,#153b71)] px-6 py-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">Public live tracking</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">MapLibre live tracking with OSM routing visibility.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">Auto-refresh every 5 seconds, rider card, ETA, route visualization, and reconnect-safe updates.</p>
          </div>

          <div className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Find booking</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Enter tracking ID</h2>

            <form onSubmit={search} className="mt-5 flex flex-col gap-3">
              <input
                value={trackingId}
                onChange={(event) => setTrackingId(event.target.value)}
                placeholder="Enter tracking id"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              />
              <button className="rounded-2xl bg-[linear-gradient(135deg,#49b857,#2b9545)] px-4 py-3 font-semibold text-white shadow-[0_16px_30px_-18px_rgba(73,184,87,0.8)]">{loading ? "Tracking..." : "Track Shipment"}</button>
            </form>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${connection === "live" ? "bg-emerald-500" : connection === "reconnecting" ? "bg-amber-500" : "bg-slate-300"}`} />
              <span>{connection === "live" ? "Live updates active" : connection === "reconnecting" ? "Reconnecting..." : "Waiting for tracking"}</span>
              {lastUpdated ? <span className="text-slate-400">Updated {lastUpdated}</span> : null}
            </div>

            {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          </div>
        </div>

        {result && pickup && drop ? (
          <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="grid gap-5">
              <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Booking summary</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">{result.booking.tracking_id}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{toStatusLabel(result.booking.status)}</span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                  <InfoRow label="Sender" value={result.booking.sender_name} />
                  <InfoRow label="Receiver" value={result.booking.receiver_name} />
                  <InfoRow label="Route" value={`${result.booking.pickup_address} to ${result.booking.drop_address}`} />
                  <InfoRow label="ETA" value={etaText} />
                  <InfoRow label="Distance to drop" value={liveDistanceKm == null ? "-" : `${liveDistanceKm.toFixed(1)} km`} />
                </div>
              </article>

              <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Rider card</p>
                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                  <InfoRow label="Rider" value={driverName} />
                  <InfoRow label="Rider phone" value={driverPhone} />
                  <InfoRow label="Vehicle" value={vehicle} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={driverPhone && driverPhone !== "-" ? `tel:${driverPhone}` : "#"}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Call
                  </a>
                  <a
                    href={driverPhone && driverPhone !== "-" ? `https://wa.me/${driverPhone.replace(/\D/g, "")}` : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Chat
                  </a>
                  <button onClick={() => void shareTracking()} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    Share tracking
                  </button>
                </div>
              </article>
            </div>

            <div className="grid gap-5">
              <article className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
                <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Live map</p>
                <LiveTrackingMap
                  pickup={pickup}
                  drop={drop}
                  rider={riderLocation}
                  route={routeCoordinates.length > 1 ? routeCoordinates : [[pickup.lng, pickup.lat], [drop.lng, drop.lat]]}
                />
              </article>

              <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Tracking timeline</p>
                <ul className="mt-4 grid gap-3">
                  {result.timeline.map((event) => (
                    <li key={event.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold uppercase tracking-[0.18em] text-slate-900">{toStatusLabel(event.status)}</p>
                        <p className="text-xs text-slate-500">{new Date(event.event_time).toLocaleString()}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{event.message}</p>
                      {event.location_label ? <p className="mt-1 text-xs text-slate-500">{event.location_label}</p> : null}
                    </li>
                  ))}
                  {result.timeline.length === 0 ? <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-600">No tracking updates yet.</li> : null}
                </ul>
              </article>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
