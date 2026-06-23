"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [passwordLoginVisible, setPasswordLoginVisible] = useState(true);
  const [authMode, setAuthMode] = useState<"otp" | "email">("otp");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [proofForm, setProofForm] = useState({ booking_id: "", trip_id: "", photo_url: "", signature_url: "", note: "" });

  const activeTrackingTrip = useMemo(
    () => trips.find((trip) => ["assigned", "accepted", "started", "pickup_complete", "in_transit"].includes(trip.status)),
    [trips]
  );

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
      setPasswordLoginVisible(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to send OTP";
      if (
        message.toLowerCase().includes("unsupported phone provider") ||
        message.toLowerCase().includes("sms provider is not configured") ||
        message.toLowerCase().includes("phone provider")
      ) {
        setPasswordLoginVisible(true);
        setError("SMS OTP provider is not configured. Use password login below, then enable Supabase Phone Auth with Twilio Verify credentials.");
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

  async function loginWithPassword(event: FormEvent) {
    event.preventDefault();
    try {
      setAuthLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/auth/rider-password-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to login with password");
      }

      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      setToken(data.access_token);
      setRefreshToken(data.refresh_token);
      setPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to login with password";
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function loginWithEmail(event: FormEvent) {
    event.preventDefault();
    try {
      setAuthLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to login with email");
      }

      if (data.user?.role !== "driver") {
        throw new Error("Driver role required");
      }

      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      setToken(data.access_token);
      setRefreshToken(data.refresh_token);
      setPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to login with email";
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

  useEffect(() => {
    if (!token || !activeTrackingTrip || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    let cancelled = false;

    const syncPosition = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) {
            return;
          }

          try {
            await requestWithRetry("/riders/location", {
              method: "POST",
              body: JSON.stringify({
                trip_id: activeTrackingTrip.id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            });
          } catch {
            // Intentionally silent to avoid disrupting rider workflow.
          }
        },
        () => {
          // Keep rider workflow uninterrupted if GPS is denied temporarily.
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 8000,
        }
      );
    };

    syncPosition();
    const timer = setInterval(syncPosition, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTrackingTrip?.id, token]);

  function logout() {
    clearSession();
    setOtpSent(false);
  }

  const activeTrips = trips.filter((trip) => ["assigned", "accepted", "started", "pickup_complete", "in_transit"].includes(trip.status)).length;
  const completedTrips = trips.filter((trip) => trip.status === "delivered").length;
  const pendingTrips = trips.filter((trip) => trip.status === "assigned").length;

  if (!token || !me) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[36px] border border-white/80 bg-white/80 shadow-[0_30px_90px_-40px_rgba(13,43,82,0.45)] backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="bg-[linear-gradient(135deg,#0d2b52,#153b71)] px-6 py-8 text-white sm:px-8 lg:px-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/90">
                Vinayaka Rider App
              </div>
              <h1 className="mt-5 max-w-md text-4xl font-bold leading-tight">Fast rider dispatch, trip control, and proof upload in one app-like screen.</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">Designed for Play Store style review expectations: direct login path, crisp action states, and clean mobile-friendly spacing for daily field use.</p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-200">Trips</p>
                  <p className="mt-2 text-3xl font-bold">Live</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-200">Login</p>
                  <p className="mt-2 text-3xl font-bold">OTP + Password</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-200">Delivery</p>
                  <p className="mt-2 text-3xl font-bold">Proof Ready</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.28)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Secure access</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">Rider login</h2>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Field ready</div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 rounded-[20px] border border-slate-200 bg-slate-50 p-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode("otp")}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${authMode === "otp" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
                  >
                    OTP Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("email")}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${authMode === "email" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
                  >
                    Email Login
                  </button>
                </div>

                {authMode === "otp" ? (
                  <>
                    <form onSubmit={requestOtp} className="mt-6 grid gap-3">
                      <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number (e.g. +919876543210)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
                      <button disabled={authLoading} className="rounded-2xl bg-[linear-gradient(135deg,#49b857,#2b9545)] px-4 py-3 font-semibold text-white shadow-[0_16px_30px_-18px_rgba(73,184,87,0.8)]">{authLoading ? "Sending OTP..." : "Send OTP"}</button>
                    </form>

                    {otpSent ? (
                      <form onSubmit={verifyOtp} className="mt-4 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <input required value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter OTP" className="rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                        <button disabled={authLoading} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900">{authLoading ? "Verifying..." : "Verify OTP & Login"}</button>
                      </form>
                    ) : null}
                  </>
                ) : (
                  <form onSubmit={loginWithEmail} className="mt-6 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">Email login fallback</p>
                    <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                    <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                    <button disabled={authLoading} className="rounded-2xl bg-[linear-gradient(135deg,#0d2b52,#153b71)] px-4 py-3 font-semibold text-white shadow-[0_16px_30px_-18px_rgba(13,43,82,0.8)]">{authLoading ? "Signing in..." : "Login With Email"}</button>
                  </form>
                )}

                {passwordLoginVisible && authMode === "otp" ? (
                  <form onSubmit={loginWithPassword} className="mt-4 grid gap-3 rounded-[24px] border border-amber-200 bg-amber-50/70 p-4">
                    <p className="text-sm font-semibold text-slate-800">Password fallback for drivers without email access</p>
                    <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Rider password" className="rounded-2xl border border-amber-200 bg-white px-4 py-3" />
                    <button disabled={authLoading} className="rounded-2xl bg-[linear-gradient(135deg,#f59c3d,#ef7c2b)] px-4 py-3 font-semibold text-white shadow-[0_16px_30px_-18px_rgba(245,156,61,0.8)]">{authLoading ? "Signing in..." : "Login With Password"}</button>
                  </form>
                ) : null}

                {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[36px] border border-white/80 bg-white/80 p-5 shadow-[0_30px_90px_-40px_rgba(13,43,82,0.45)] backdrop-blur sm:p-6">
        <header className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] bg-[linear-gradient(135deg,#0d2b52,#153b71)] px-6 py-7 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">Rider command</p>
                <h1 className="mt-2 text-3xl font-bold">Hi, {me.full_name}</h1>
                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-200">Accept rides quickly, update trip status in one tap, and close deliveries with proof capture.</p>
              </div>
              <button onClick={logout} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white">Logout</button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard title="Active" value={activeTrips} tone="green" />
            <MetricCard title="Waiting" value={pendingTrips} tone="orange" />
            <MetricCard title="Delivered" value={completedTrips} tone="navy" />
          </div>
        </header>

        {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4">
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Assigned rides</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Trip queue</h2>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live sync</div>
              </div>

              <section className="mt-4 grid gap-3">
        {trips.map((trip) => (
                <div key={trip.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{trip.bookings?.tracking_id ?? trip.booking_id}</p>
                      <p className="mt-1 text-sm text-slate-600">{trip.bookings?.pickup_address ?? "-"} to {trip.bookings?.drop_address ?? "-"}</p>
                    </div>
                    <StatusBadge status={trip.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton label="Accept" tone="green" onClick={() => tripAction(trip.id, "accept")} />
                    <ActionButton label="Reject" tone="muted" onClick={() => tripAction(trip.id, "reject")} />
                    <ActionButton label="Start" tone="navy" onClick={() => tripAction(trip.id, "start")} />
                    <ActionButton label="Pickup Done" tone="orange" onClick={() => tripAction(trip.id, "pickup_complete")} />
                    <ActionButton label="In Transit" tone="navy" onClick={() => tripAction(trip.id, "in_transit")} />
                    <ActionButton label="Delivered" tone="green" onClick={() => tripAction(trip.id, "delivered")} />
                  </div>
                </div>
        ))}
                {trips.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-600">No trips assigned yet.</p> : null}
              </section>
            </div>
          </div>

          <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Close delivery</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Upload proof</h2>
              </div>
              <div className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">Play Store ready</div>
            </div>

            <form onSubmit={uploadProof} className="mt-4 grid gap-3 md:grid-cols-2">
          <select aria-label="Proof trip" required value={proofForm.trip_id} onChange={(event) => {
            const selectedTrip = trips.find((trip) => trip.id === event.target.value);
            setProofForm((value) => ({ ...value, trip_id: event.target.value, booking_id: selectedTrip?.booking_id ?? "" }));
          }} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <option value="">Select trip</option>
            {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.bookings?.tracking_id ?? trip.id}</option>)}
          </select>
          <input required value={proofForm.photo_url} onChange={(event) => setProofForm((value) => ({ ...value, photo_url: event.target.value }))} placeholder="Photo URL" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          <input required value={proofForm.signature_url} onChange={(event) => setProofForm((value) => ({ ...value, signature_url: event.target.value }))} placeholder="Signature URL" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          <input value={proofForm.note} onChange={(event) => setProofForm((value) => ({ ...value, note: event.target.value }))} placeholder="Delivery note" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          <button className="rounded-2xl bg-[linear-gradient(135deg,#49b857,#2b9545)] px-4 py-3 font-semibold text-white shadow-[0_16px_30px_-18px_rgba(73,184,87,0.8)]">Upload Proof</button>
            </form>
          </section>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ title, value, tone }: { title: string; value: number; tone: "green" | "orange" | "navy" }) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    navy: "bg-slate-100 text-slate-800 border-slate-200",
  } as const;

  return (
    <article className={`rounded-[28px] border p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.18)] ${styles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em]">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    assigned: "bg-blue-50 text-blue-700",
    accepted: "bg-emerald-50 text-emerald-700",
    started: "bg-slate-100 text-slate-800",
    pickup_complete: "bg-orange-50 text-orange-700",
    in_transit: "bg-indigo-50 text-indigo-700",
    delivered: "bg-emerald-50 text-emerald-700",
    reject: "bg-red-50 text-red-700",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${palette[status] ?? "bg-slate-100 text-slate-700"}`}>{status.replaceAll("_", " ")}</span>;
}

function ActionButton({ label, tone, onClick }: { label: string; tone: "green" | "orange" | "navy" | "muted"; onClick: () => void }) {
  const styles = {
    green: "bg-emerald-600 text-white",
    orange: "bg-orange-500 text-white",
    navy: "bg-slate-900 text-white",
    muted: "bg-white text-slate-800 border border-slate-300",
  } as const;

  return <button onClick={onClick} className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm ${styles[tone]}`}>{label}</button>;
}
