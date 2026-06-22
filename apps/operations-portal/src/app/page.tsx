"use client";

import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";

type Role = "customer" | "driver" | "operations_staff" | "admin";

type AuthUser = {
  id: string;
  full_name: string;
  role: Role;
};

type Branch = { id: string; name: string };
type Driver = { id: string; user_id: string; vehicle_id: string | null; is_approved: boolean; status: string };
type Booking = {
  id: string;
  tracking_id: string;
  customer_user_id: string;
  sender_phone: string;
  sender_name: string;
  receiver_name: string;
  pickup_address: string;
  drop_address: string;
  status: string;
  branch_id: string;
  created_at: string;
};

type Trip = {
  id: string;
  booking_id: string;
  driver_id: string | null;
  status: string;
  fare_amount: number | null;
  created_at?: string;
};

type AppUser = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  phone: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://vinayaka-transport-api.vercel.app/api/v1";
const TOKEN_KEY = "vinayaka_operations_token";
const REFRESH_TOKEN_KEY = "vinayaka_operations_refresh_token";

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

export default function OperationsPortalPage() {
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [me, setMe] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  const [riderSearch, setRiderSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const deferredRiderSearch = useDeferredValue(riderSearch);
  const deferredCustomerSearch = useDeferredValue(customerSearch);

  const [bookingForm, setBookingForm] = useState({
    branch_id: "",
    sender_name: "",
    sender_phone: "",
    receiver_name: "",
    receiver_phone: "",
    pickup_address: "",
    pickup_lat: "",
    pickup_lng: "",
    drop_address: "",
    drop_lat: "",
    drop_lng: "",
    vehicle_type: "bike",
    cod_required: false,
    cod_amount: "",
  });

  const [assignment, setAssignment] = useState({ booking_id: "", driver_id: "" });

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

    void loadSession(token);
  }, [token]);

  async function loadSession(authToken: string) {
    try {
      setError("");
      const profile = await api<{ user: AuthUser }>("/auth/me", authToken);
      if (profile.user.role !== "operations_staff" && profile.user.role !== "admin") {
        throw new Error("Operations access required");
      }

      setMe(profile.user);
      await reload(authToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load operations portal";
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
    const [branchData, driverData, bookingData, tripData, userData] = await Promise.all([
      authToken === token ? requestWithRetry<Branch[]>("/branches") : api<Branch[]>("/branches", authToken),
      authToken === token ? requestWithRetry<Driver[]>("/drivers") : api<Driver[]>("/drivers", authToken),
      authToken === token ? requestWithRetry<{ items: Booking[] }>("/bookings?page=1&limit=50") : api<{ items: Booking[] }>("/bookings?page=1&limit=50", authToken),
      authToken === token ? requestWithRetry<Trip[]>("/trips") : api<Trip[]>("/trips", authToken),
      authToken === token ? requestWithRetry<AppUser[]>("/users") : api<AppUser[]>("/users", authToken),
    ]);

    setBranches(branchData);
    setDrivers(driverData);
    setBookings(bookingData.items ?? []);
    setTrips(tripData);
    setUsers(userData);
  }

  const today = new Date().toISOString().slice(0, 10);
  const riderUsers = useMemo(() => {
    const term = deferredRiderSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (user.role !== "driver") {
        return false;
      }
      if (!term) {
        return true;
      }
      return [user.full_name, user.email, user.phone ?? ""].some((value) => value.toLowerCase().includes(term));
    });
  }, [users, deferredRiderSearch]);

  const customerUsers = useMemo(() => {
    const term = deferredCustomerSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (user.role !== "customer") {
        return false;
      }
      if (!term) {
        return true;
      }
      return [user.full_name, user.email, user.phone ?? ""].some((value) => value.toLowerCase().includes(term));
    });
  }, [users, deferredCustomerSearch]);

  const riderAttendance = useMemo(() => {
    const driverMap = new Map<string, string>();
    for (const driver of drivers) {
      driverMap.set(driver.id, driver.user_id);
    }

    const present = new Set<string>();
    for (const trip of trips) {
      if (!trip.driver_id || !trip.created_at?.startsWith(today)) {
        continue;
      }
      const userId = driverMap.get(trip.driver_id);
      if (userId) {
        present.add(userId);
      }
    }
    return present;
  }, [drivers, trips, today]);

  const customerAttendance = useMemo(() => {
    const present = new Set<string>();
    for (const booking of bookings) {
      if (booking.created_at?.startsWith(today)) {
        present.add(booking.customer_user_id);
      }
    }
    return present;
  }, [bookings, today]);

  const riderTripCount = (userId: string) => {
    const driverIds = drivers.filter((driver) => driver.user_id === userId).map((driver) => driver.id);
    if (!driverIds.length) {
      return 0;
    }
    return trips.filter((trip) => trip.driver_id && driverIds.includes(trip.driver_id)).length;
  };

  const customerBookingCount = (userId: string, phone: string | null) => {
    return bookings.filter((booking) => booking.customer_user_id === userId || (!!phone && booking.sender_phone === phone)).length;
  };

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
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      setToken(data.access_token);
      setRefreshToken(data.refresh_token);
      setPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    }
  }

  async function createManualBooking(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      await requestWithRetry("/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...bookingForm,
          pickup_lat: Number(bookingForm.pickup_lat),
          pickup_lng: Number(bookingForm.pickup_lng),
          drop_lat: Number(bookingForm.drop_lat),
          drop_lng: Number(bookingForm.drop_lng),
          cod_amount: bookingForm.cod_amount ? Number(bookingForm.cod_amount) : undefined,
        }),
      });

      setBookingForm({
        branch_id: "",
        sender_name: "",
        sender_phone: "",
        receiver_name: "",
        receiver_phone: "",
        pickup_address: "",
        pickup_lat: "",
        pickup_lng: "",
        drop_address: "",
        drop_lat: "",
        drop_lng: "",
        vehicle_type: "bike",
        cod_required: false,
        cod_amount: "",
      });
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to create booking";
      setError(message);
    }
  }

  async function assignDriver(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      const selectedDriver = drivers.find((driver) => driver.id === assignment.driver_id);
      await requestWithRetry("/trips", {
        method: "POST",
        body: JSON.stringify({
          booking_id: assignment.booking_id,
          driver_id: assignment.driver_id,
          vehicle_id: selectedDriver?.vehicle_id ?? null,
          assigned_by_user_id: me?.id,
          status: "assigned",
        }),
      });

      await requestWithRetry(`/bookings/${assignment.booking_id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "assigned" }),
      });

      setAssignment({ booking_id: "", driver_id: "" });
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to assign driver";
      setError(message);
    }
  }

  async function reassignTrip(tripId: string, driverId: string) {
    try {
      setError("");
      const selectedDriver = drivers.find((driver) => driver.id === driverId);
      await requestWithRetry(`/trips/${tripId}`, {
        method: "PATCH",
        body: JSON.stringify({
          driver_id: driverId,
          vehicle_id: selectedDriver?.vehicle_id ?? null,
          status: "assigned",
        }),
      });
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to reassign trip";
      setError(message);
    }
  }

  function logout() {
    clearSession();
  }

  async function forgotPassword(event: FormEvent) {
    event.preventDefault();
    try {
      setForgotMessage("");
      setError("");
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send reset link");
      }
      setForgotMessage("Reset link sent. Check your email inbox.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to send reset link";
      setError(message);
    }
  }

  if (!token || !me) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[36px] border border-white/80 bg-white/80 shadow-[0_30px_90px_-40px_rgba(13,43,82,0.45)] backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-[linear-gradient(135deg,#0d2b52,#153b71)] px-6 py-8 text-white sm:px-8 lg:px-10">
              <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-200">Operations counter</p>
              <h1 className="mt-5 max-w-md text-4xl font-bold leading-tight">Create bookings, assign riders, and control trip flow with smoother dispatch tools.</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">Designed to feel closer to a production-grade counter app: cleaner forms, quicker actions, and more readable live records.</p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.28)]">
                <h2 className="text-2xl font-bold text-slate-900">Operations login</h2>
                <p className="mt-2 text-sm text-slate-600">Access booking, assignment, and rider activity controls.</p>
                <form onSubmit={login} className="mt-6 grid gap-3">
                  <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Operations email" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
                  <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
                  <button className="rounded-2xl bg-[linear-gradient(135deg,#49b857,#2b9545)] px-4 py-3 font-semibold text-white shadow-[0_16px_30px_-18px_rgba(73,184,87,0.8)]">Login</button>
                </form>
                <form onSubmit={forgotPassword} className="mt-4 grid gap-2 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">Forgot password</p>
                  <input required type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} placeholder="Email for reset link" className="rounded-2xl border border-slate-200 bg-white px-4 py-3" />
                  <button className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900">Send Reset Link</button>
          {forgotMessage ? <p className="text-sm text-green-700">{forgotMessage}</p> : null}
                </form>
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
      <header className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] bg-[linear-gradient(135deg,#0d2b52,#153b71)] px-6 py-7 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">Counter operations</p>
              <h1 className="mt-2 text-3xl font-bold">Dispatch and booking control</h1>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-200">Create manual bookings, assign riders quickly, and monitor live trips in a cleaner interface.</p>
            </div>
            <button onClick={logout} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white">Logout</button>
          </div>
        </div>
        <div className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Ready now</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{bookings.length} bookings loaded</h2>
          <p className="mt-2 text-sm text-slate-600">Approved rider profiles now show in assignment, and search lists use deferred filtering to keep the app smoother.</p>
        </div>
      </header>

      {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={createManualBooking} className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <h2 className="text-xl font-semibold">Create Manual Booking</h2>
          <div className="mt-3 grid gap-2">
            <select aria-label="Booking branch" required value={bookingForm.branch_id} onChange={(event) => setBookingForm((value) => ({ ...value, branch_id: event.target.value }))} className="rounded-md border px-3 py-2">
              <option value="">Select branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <input required value={bookingForm.sender_name} onChange={(event) => setBookingForm((value) => ({ ...value, sender_name: event.target.value }))} placeholder="Sender name (e.g. Ravi Kumar)" className="rounded-md border px-3 py-2" />
            <input required value={bookingForm.sender_phone} onChange={(event) => setBookingForm((value) => ({ ...value, sender_phone: event.target.value }))} placeholder="Sender phone (+91...)" className="rounded-md border px-3 py-2" />
            <input required value={bookingForm.receiver_name} onChange={(event) => setBookingForm((value) => ({ ...value, receiver_name: event.target.value }))} placeholder="Receiver name (e.g. Suresh Reddy)" className="rounded-md border px-3 py-2" />
            <input required value={bookingForm.receiver_phone} onChange={(event) => setBookingForm((value) => ({ ...value, receiver_phone: event.target.value }))} placeholder="Receiver phone (+91...)" className="rounded-md border px-3 py-2" />
            <input required value={bookingForm.pickup_address} onChange={(event) => setBookingForm((value) => ({ ...value, pickup_address: event.target.value }))} placeholder="Pickup address (e.g. RTC Bus Stand, Nellore)" className="rounded-md border px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" step="0.0001" value={bookingForm.pickup_lat} onChange={(event) => setBookingForm((value) => ({ ...value, pickup_lat: event.target.value }))} placeholder="Pickup lat (14.4426)" className="rounded-md border px-3 py-2" />
              <input required type="number" step="0.0001" value={bookingForm.pickup_lng} onChange={(event) => setBookingForm((value) => ({ ...value, pickup_lng: event.target.value }))} placeholder="Pickup lng (79.9865)" className="rounded-md border px-3 py-2" />
            </div>
            <input required value={bookingForm.drop_address} onChange={(event) => setBookingForm((value) => ({ ...value, drop_address: event.target.value }))} placeholder="Drop address (e.g. Podalakur Main Center)" className="rounded-md border px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" step="0.0001" value={bookingForm.drop_lat} onChange={(event) => setBookingForm((value) => ({ ...value, drop_lat: event.target.value }))} placeholder="Drop lat (14.3844)" className="rounded-md border px-3 py-2" />
              <input required type="number" step="0.0001" value={bookingForm.drop_lng} onChange={(event) => setBookingForm((value) => ({ ...value, drop_lng: event.target.value }))} placeholder="Drop lng (79.9267)" className="rounded-md border px-3 py-2" />
            </div>
            <select aria-label="Booking vehicle type" value={bookingForm.vehicle_type} onChange={(event) => setBookingForm((value) => ({ ...value, vehicle_type: event.target.value }))} className="rounded-md border px-3 py-2">
              <option value="bike">Bike</option>
              <option value="auto">Auto</option>
              <option value="car">Car</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bookingForm.cod_required} onChange={(event) => setBookingForm((value) => ({ ...value, cod_required: event.target.checked }))} />
              COD required
            </label>
            {bookingForm.cod_required ? <input type="number" step="0.01" value={bookingForm.cod_amount} onChange={(event) => setBookingForm((value) => ({ ...value, cod_amount: event.target.value }))} placeholder="COD amount" className="rounded-md border px-3 py-2" /> : null}
            <button className="rounded-md bg-ocean px-4 py-2 font-semibold text-white">Create Booking</button>
          </div>
        </form>

        <form onSubmit={assignDriver} className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <h2 className="text-xl font-semibold">Assign Driver</h2>
          <div className="mt-3 grid gap-2">
            <select aria-label="Assignment booking" required value={assignment.booking_id} onChange={(event) => setAssignment((value) => ({ ...value, booking_id: event.target.value }))} className="rounded-md border px-3 py-2">
              <option value="">Select booking</option>
              {bookings.filter((booking) => booking.status === "booked" || booking.status === "assigned").map((booking) => (
                <option key={booking.id} value={booking.id}>{booking.tracking_id} - {booking.sender_name}</option>
              ))}
            </select>
            <select aria-label="Assignment driver" required value={assignment.driver_id} onChange={(event) => setAssignment((value) => ({ ...value, driver_id: event.target.value }))} className="rounded-md border px-3 py-2">
              <option value="">Select driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.id.slice(0, 8)} - {driver.status} {driver.is_approved ? "(approved)" : "(pending)"}</option>
              ))}
            </select>
            {drivers.length === 0 ? <p className="text-xs text-amber-700">No riders available. In Admin, run Sync and Approve Rider Profiles first.</p> : null}
            <button className="rounded-md bg-ocean px-4 py-2 font-semibold text-white">Assign / Reassign</button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
        <h2 className="text-xl font-semibold">Bookings</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Tracking</th>
                <th className="py-2">Status</th>
                <th className="py-2">Route</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b">
                  <td className="py-2">{booking.tracking_id}</td>
                  <td className="py-2">{booking.status}</td>
                  <td className="py-2">{booking.pickup_address} to {booking.drop_address}</td>
                  <td className="py-2">{new Date(booking.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
        <h2 className="text-xl font-semibold">Trips</h2>
        <div className="mt-3 grid gap-3">
          {trips.map((trip) => (
              <div key={trip.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold">Trip {trip.id.slice(0, 8)} - {trip.status}</p>
              <p className="text-sm text-slate-600">Booking: {trip.booking_id.slice(0, 8)} | Driver: {trip.driver_id ? trip.driver_id.slice(0, 8) : "unassigned"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {drivers.map((driver) => (
                  <button key={driver.id} onClick={() => reassignTrip(trip.id, driver.id)} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900">Reassign to {driver.id.slice(0, 4)}</button>
                ))}
              </div>
            </div>
          ))}
          {trips.length === 0 ? <p className="text-sm text-slate-600">No trips yet.</p> : null}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <h2 className="text-xl font-semibold">Rider History</h2>
          <input value={riderSearch} onChange={(event) => setRiderSearch(event.target.value)} placeholder="Search rider by name, email, phone" className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Rider</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Trips</th>
                  <th className="py-2">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {riderUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">{user.full_name}</td>
                    <td className="py-2">{user.phone ?? "-"}</td>
                    <td className="py-2">{riderTripCount(user.id)}</td>
                    <td className="py-2">{riderAttendance.has(user.id) ? "Present" : "Absent"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <h2 className="text-xl font-semibold">Customer History</h2>
          <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer by name, email, phone" className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Customer</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Bookings</th>
                  <th className="py-2">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {customerUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">{user.full_name}</td>
                    <td className="py-2">{user.phone ?? "-"}</td>
                    <td className="py-2">{customerBookingCount(user.id, user.phone)}</td>
                    <td className="py-2">{customerAttendance.has(user.id) ? "Present" : "Absent"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </section>
    </main>
  );
}
