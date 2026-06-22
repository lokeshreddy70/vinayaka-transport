"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = "customer" | "driver" | "operations_staff" | "admin";

type AuthUser = {
  id: string;
  full_name: string;
  role: Role;
};

type Trip = {
  id: string;
  booking_id: string;
  status: string;
  bookings?: {
    tracking_id: string;
    pickup_address: string;
    drop_address: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://vinayaka-transport-api.vercel.app/api/v1";
const TOKEN_KEY = "vinayaka_rider_token";

async function api<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data as T;
}

export default function RiderPortalPage() {
  const [token, setToken] = useState("");
  const [me, setMe] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [proofForm, setProofForm] = useState({ booking_id: "", trip_id: "", photo_url: "", signature_url: "", note: "" });

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY) ?? "";
    if (stored) {
      setToken(stored);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    void initialize(token);
  }, [token]);

  async function initialize(authToken: string) {
    try {
      setError("");
      const profile = await api<{ user: AuthUser }>("/auth/me", authToken);
      if (profile.user.role !== "driver") {
        throw new Error("Driver role required");
      }

      setMe(profile.user);
      await reload(authToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to load rider portal";
      setError(message);
      localStorage.removeItem(TOKEN_KEY);
      setToken("");
      setMe(null);
    }
  }

  async function reload(authToken = token) {
    const tripData = await api<Trip[]>("/riders/trips", authToken);
    setTrips(tripData);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Invalid credentials");
      }

      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    }
  }

  async function tripAction(tripId: string, action: string) {
    try {
      setError("");
      await api(`/riders/trips/${tripId}/action`, token, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to update trip";
      setError(message);
    }
  }

  async function uploadProof(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      await api("/riders/proofs", token, {
        method: "POST",
        body: JSON.stringify(proofForm),
      });
      setProofForm({ booking_id: "", trip_id: "", photo_url: "", signature_url: "", note: "" });
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to upload proof";
      setError(message);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setMe(null);
  }

  if (!token || !me) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-3xl font-bold text-ocean">Vinayaka Rider Portal</h1>
        <p className="mt-2 text-slate-600">Accept trips, update transit status, and upload delivery proof.</p>
        <form onSubmit={login} className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow">
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Driver email" className="rounded-md border px-3 py-2" />
          <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="rounded-md border px-3 py-2" />
          <button className="rounded-md bg-ocean px-4 py-2 font-semibold text-white">Login</button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ocean">Vinayaka Rider Portal</h1>
          <p className="mt-1 text-slate-600">Accept or reject trips, start, pickup complete, in transit, delivered, and proof upload.</p>
        </div>
        <button onClick={logout} className="rounded-md border px-3 py-2">Logout</button>
      </header>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <section className="mt-4 grid gap-3">
        {trips.map((trip) => (
          <div key={trip.id} className="rounded-xl bg-white p-4 shadow">
            <p className="font-semibold">{trip.bookings?.tracking_id ?? trip.booking_id} - {trip.status}</p>
            <p className="text-sm text-slate-600">{trip.bookings?.pickup_address ?? "-"} to {trip.bookings?.drop_address ?? "-"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => tripAction(trip.id, "accept")} className="rounded-md border px-3 py-1 text-sm">Accept</button>
              <button onClick={() => tripAction(trip.id, "reject")} className="rounded-md border px-3 py-1 text-sm">Reject</button>
              <button onClick={() => tripAction(trip.id, "start")} className="rounded-md border px-3 py-1 text-sm">Start</button>
              <button onClick={() => tripAction(trip.id, "pickup_complete")} className="rounded-md border px-3 py-1 text-sm">Pickup Complete</button>
              <button onClick={() => tripAction(trip.id, "in_transit")} className="rounded-md border px-3 py-1 text-sm">In Transit</button>
              <button onClick={() => tripAction(trip.id, "delivered")} className="rounded-md border px-3 py-1 text-sm">Delivered</button>
            </div>
          </div>
        ))}
        {trips.length === 0 ? <p className="text-sm text-slate-600">No trips assigned.</p> : null}
      </section>

      <section className="mt-6 rounded-xl bg-white p-4 shadow">
        <h2 className="text-xl font-semibold">Upload Delivery Proof</h2>
        <form onSubmit={uploadProof} className="mt-3 grid gap-2 md:grid-cols-2">
          <select required value={proofForm.trip_id} onChange={(event) => {
            const selectedTrip = trips.find((trip) => trip.id === event.target.value);
            setProofForm((value) => ({ ...value, trip_id: event.target.value, booking_id: selectedTrip?.booking_id ?? "" }));
          }} className="rounded-md border px-3 py-2">
            <option value="">Select trip</option>
            {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.bookings?.tracking_id ?? trip.id}</option>)}
          </select>
          <input required value={proofForm.photo_url} onChange={(event) => setProofForm((value) => ({ ...value, photo_url: event.target.value }))} placeholder="Photo URL" className="rounded-md border px-3 py-2" />
          <input required value={proofForm.signature_url} onChange={(event) => setProofForm((value) => ({ ...value, signature_url: event.target.value }))} placeholder="Signature URL" className="rounded-md border px-3 py-2" />
          <input value={proofForm.note} onChange={(event) => setProofForm((value) => ({ ...value, note: event.target.value }))} placeholder="Note" className="rounded-md border px-3 py-2" />
          <button className="rounded-md bg-ocean px-4 py-2 font-semibold text-white">Upload Proof</button>
        </form>
      </section>
    </main>
  );
}
