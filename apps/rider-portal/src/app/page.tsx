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
const REFRESH_TOKEN_KEY = "vinayaka_rider_refresh_token";

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
    const error = new Error(data.error ?? "Request failed") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

export default function RiderPortalPage() {
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [me, setMe] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [proofForm, setProofForm] = useState({ booking_id: "", trip_id: "", photo_url: "", signature_url: "", note: "" });

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY) ?? "";
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";
    if (stored) {
      setToken(stored);
    }
    if (storedRefresh) {
      setRefreshToken(storedRefresh);
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
      if (refreshToken) {
        const ok = await refreshSession(refreshToken);
        if (ok) {
          return;
        }
      }
      clearSession();
    }
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken("");
    setRefreshToken("");
    setMe(null);
  }

  async function refreshSession(currentRefreshToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        return false;
      }

      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      setToken(data.access_token);
      setRefreshToken(data.refresh_token);
      setMe(data.user);
      return true;
    } catch {
      return false;
    }
  }

  async function requestWithRetry<T>(path: string, options: RequestInit = {}): Promise<T> {
    try {
      return await api<T>(path, token, options);
    } catch (err: unknown) {
      const typed = err as Error & { status?: number };
      if (typed.status === 401 && refreshToken) {
        const ok = await refreshSession(refreshToken);
        if (!ok) {
          clearSession();
          throw new Error("Session expired. Please login again.");
        }
        const latest = localStorage.getItem(TOKEN_KEY) ?? "";
        return await api<T>(path, latest, options);
      }

      throw err;
    }
  }

  async function reload(authToken = token) {
    const tripData = authToken === token
      ? await requestWithRetry<Trip[]>("/riders/trips")
      : await api<Trip[]>("/riders/trips", authToken);
    setTrips(tripData);
  }

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    try {
      setAuthLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/auth/rider-request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send OTP");
      }
      setOtpSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to send OTP";
      if (message.toLowerCase().includes("unsupported phone provider")) {
        setError("SMS provider is not enabled in backend auth settings. Ask admin to enable phone OTP provider and SMS credentials.");
      } else {
        setError(message);
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    try {
      setAuthLoading(true);
      setError("");
      const otpResponse = await fetch(`${API_URL}/auth/rider-verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, token: otp }),
      });
      const otpData = await otpResponse.json();
      if (!otpResponse.ok) {
        throw new Error(otpData.error ?? "Invalid OTP");
      }

      localStorage.setItem(TOKEN_KEY, otpData.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, otpData.refresh_token);
      setToken(otpData.access_token);
      setRefreshToken(otpData.refresh_token);
      setOtp("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OTP verification failed";
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function tripAction(tripId: string, action: string) {
    try {
      setError("");
      await requestWithRetry(`/riders/trips/${tripId}/action`, {
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
      await requestWithRetry("/riders/proofs", {
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
    clearSession();
    setOtpSent(false);
  }

  if (!token || !me) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-3xl font-bold text-ocean">Vinayaka Rider Portal</h1>
        <p className="mt-2 text-slate-600">Login with mobile OTP, then accept trips, update transit status, and upload proof.</p>
        <form onSubmit={requestOtp} className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow">
          <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number (e.g. +919876543210)" className="rounded-md border px-3 py-2" />
          <button disabled={authLoading} className="rounded-md bg-ocean px-4 py-2 font-semibold text-white">{authLoading ? "Sending OTP..." : "Send OTP"}</button>
        </form>

        {otpSent ? (
          <form onSubmit={verifyOtp} className="mt-3 grid gap-3 rounded-xl bg-white p-4 shadow">
            <input required value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter OTP" className="rounded-md border px-3 py-2" />
            <button disabled={authLoading} className="rounded-md border px-4 py-2 font-semibold">{authLoading ? "Verifying..." : "Verify OTP & Login"}</button>
          </form>
        ) : null}
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
          <select aria-label="Proof trip" required value={proofForm.trip_id} onChange={(event) => {
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
