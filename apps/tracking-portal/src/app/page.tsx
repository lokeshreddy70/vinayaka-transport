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
      const message = err instanceof Error ? err.message : "Unable to track booking";
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
    <main className="mx-auto max-w-[980px] px-6 py-6">
      <h1 className="text-3xl font-bold text-ocean">Vinayaka Public Tracking</h1>
      <p className="mt-2 text-slate-600">Track by tracking id and view booking, driver, vehicle, timeline, ETA, and delivery proof.</p>

      <form onSubmit={search} className="mt-4 flex flex-col gap-2 md:flex-row">
        <input
          value={trackingId}
          onChange={(event) => setTrackingId(event.target.value)}
          placeholder="Enter tracking id"
          className="w-full rounded-md border px-3 py-2 md:max-w-[420px]"
        />
        <button className="rounded-md border px-4 py-2 font-semibold">{loading ? "Tracking..." : "Track"}</button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {result ? (
        <section className="mt-6 grid gap-4">
          <article className="rounded-xl bg-white p-4 shadow">
            <h2 className="text-xl font-semibold">Booking</h2>
            <p className="mt-2"><strong>Tracking:</strong> {result.booking.tracking_id}</p>
            <p><strong>Status:</strong> {result.booking.status}</p>
            <p><strong>Sender:</strong> {result.booking.sender_name}</p>
            <p><strong>Receiver:</strong> {result.booking.receiver_name}</p>
            <p><strong>Route:</strong> {result.booking.pickup_address} to {result.booking.drop_address}</p>
            <p><strong>Estimated Arrival:</strong> {result.booking.estimated_arrival_at ? new Date(result.booking.estimated_arrival_at).toLocaleString() : "Not available"}</p>
          </article>

          <article className="rounded-xl bg-white p-4 shadow">
            <h2 className="text-xl font-semibold">Driver & Vehicle</h2>
            <p className="mt-2"><strong>Driver:</strong> {driverName}</p>
            <p><strong>Driver Phone:</strong> {driverPhone}</p>
            <p><strong>Vehicle:</strong> {vehicle}</p>
          </article>

          <article className="rounded-xl bg-white p-4 shadow">
            <h2 className="text-xl font-semibold">Timeline</h2>
            <ul className="mt-3 grid gap-2">
              {result.timeline.map((event) => (
                <li key={event.id} className="rounded-md border p-3">
                  <p className="font-semibold uppercase">{event.status}</p>
                  <p className="text-sm text-slate-600">{event.message}</p>
                  <p className="text-xs text-slate-500">{new Date(event.event_time).toLocaleString()}</p>
                  {event.location_label ? <p className="text-xs text-slate-500">{event.location_label}</p> : null}
                </li>
              ))}
              {result.timeline.length === 0 ? <li className="text-sm text-slate-600">No tracking updates yet.</li> : null}
            </ul>
          </article>

          <article className="rounded-xl bg-white p-4 shadow">
            <h2 className="text-xl font-semibold">Delivery Proof</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {result.booking.delivery_proofs.map((proof) => (
                <div key={proof.id} className="rounded-md border p-3">
                  <p className="text-sm">{proof.note || "Delivery proof"}</p>
                  {proof.photo_url ? <a className="text-sm text-blue-700 underline" href={proof.photo_url} target="_blank" rel="noreferrer">View Photo</a> : <p className="text-sm text-slate-500">No photo</p>}
                  {proof.signature_url ? <a className="block text-sm text-blue-700 underline" href={proof.signature_url} target="_blank" rel="noreferrer">View Signature</a> : <p className="text-sm text-slate-500">No signature</p>}
                </div>
              ))}
              {result.booking.delivery_proofs.length === 0 ? <p className="text-sm text-slate-600">No delivery proof uploaded.</p> : null}
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
