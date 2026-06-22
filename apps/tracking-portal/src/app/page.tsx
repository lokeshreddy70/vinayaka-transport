"use client";

import { FormEvent, useState } from "react";

type TrackingEvent = {
  id: string;
  status: string;
  message: string;
  location_label: string | null;
  event_time: string;
};

type TrackingResult = {
  booking: {
    id: string;
    tracking_id: string;
    sender_name: string;
    receiver_name: string;
    pickup_address: string;
    drop_address: string;
    status: string;
    estimated_arrival_at: string | null;
    trips: Array<{
      id: string;
      status: string;
      drivers?: {
        id: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://vinayaka-transport-api.vercel.app/api/v1";

export default function TrackingPortalPage() {
  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!trackingId.trim()) {
      setError("Enter a tracking id");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/tracking/${encodeURIComponent(trackingId.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Tracking failed");
      }

      setResult(data as TrackingResult);
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : "Unable to track booking";
      if (message.toLowerCase().includes("failed to fetch")) {
        message = "Unable to reach tracking service. Please check connection and try again.";
      }
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const activeTrip = result?.booking.trips?.[0];
  const driverName = activeTrip?.drivers?.users?.full_name ?? "Not assigned";
  const driverPhone = activeTrip?.drivers?.users?.phone ?? "-";
  const vehicle = activeTrip?.vehicles ? `${activeTrip.vehicles.registration_no}${activeTrip.vehicles.model_name ? ` (${activeTrip.vehicles.model_name})` : ""}` : "Not assigned";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[36px] border border-white/80 bg-white/80 p-5 shadow-[0_30px_90px_-40px_rgba(13,43,82,0.45)] backdrop-blur sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] bg-[linear-gradient(135deg,#0d2b52,#153b71)] px-6 py-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">Public live tracking</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">Track every shipment with a clean, customer-ready experience.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">Fast lookup, route clarity, ETA, rider details, and proof visibility in a single polished portal.</p>
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

            {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          </div>
        </div>

        {result ? (
          <section className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="grid gap-5">
              <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Booking summary</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">{result.booking.tracking_id}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{result.booking.status}</span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                  <InfoRow label="Sender" value={result.booking.sender_name} />
                  <InfoRow label="Receiver" value={result.booking.receiver_name} />
                  <InfoRow label="Route" value={`${result.booking.pickup_address} to ${result.booking.drop_address}`} />
                  <InfoRow label="Estimated arrival" value={result.booking.estimated_arrival_at ? new Date(result.booking.estimated_arrival_at).toLocaleString() : "Not available"} />
                </div>
              </article>

              <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Driver and vehicle</p>
                <div className="mt-4 grid gap-3 text-sm text-slate-700">
                  <InfoRow label="Driver" value={driverName} />
                  <InfoRow label="Driver phone" value={driverPhone} />
                  <InfoRow label="Vehicle" value={vehicle} />
                </div>
              </article>
            </div>

            <div className="grid gap-5">
              <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Timeline</p>
                <ul className="mt-4 grid gap-3">
                  {result.timeline.map((event) => (
                    <li key={event.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold uppercase tracking-[0.18em] text-slate-900">{event.status}</p>
                        <p className="text-xs text-slate-500">{new Date(event.event_time).toLocaleString()}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{event.message}</p>
                      {event.location_label ? <p className="mt-1 text-xs text-slate-500">{event.location_label}</p> : null}
                    </li>
                  ))}
                  {result.timeline.length === 0 ? <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-600">No tracking updates yet.</li> : null}
                </ul>
              </article>

              <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Delivery proof</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {result.booking.delivery_proofs.map((proof) => (
                    <div key={proof.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-sm font-semibold text-slate-900">{proof.note || "Delivery proof"}</p>
                      {proof.photo_url ? <a className="mt-3 block text-sm font-medium text-emerald-700 underline" href={proof.photo_url} target="_blank" rel="noreferrer">View photo</a> : <p className="mt-3 text-sm text-slate-500">No photo</p>}
                      {proof.signature_url ? <a className="mt-2 block text-sm font-medium text-slate-700 underline" href={proof.signature_url} target="_blank" rel="noreferrer">View signature</a> : <p className="mt-2 text-sm text-slate-500">No signature</p>}
                    </div>
                  ))}
                  {result.booking.delivery_proofs.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-600">No delivery proof uploaded.</p> : null}
                </div>
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
