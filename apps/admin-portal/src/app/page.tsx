"use client";

import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";

type Role = "customer" | "driver" | "operations_staff" | "admin";

type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
};

type Branch = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  radius_km: number;
};

type PricingRule = {
  id: string;
  branch_id: string;
  vehicle_type: "bike" | "auto" | "car";
  base_fare: number;
  per_km_rate: number;
  min_fare: number;
  commission_percent: number;
  cod_enabled: boolean;
};

type AppUser = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  phone: string | null;
};

type DriverRecord = {
  id: string;
  user_id: string;
  status: string;
  is_approved: boolean;
};

type BookingHistory = {
  id: string;
  tracking_id: string;
  customer_user_id: string;
  sender_phone: string;
  status: string;
  created_at: string;
};

type TripHistory = {
  id: string;
  driver_id: string | null;
  booking_id: string;
  status: string;
  created_at: string;
};

type Complaint = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
};

type DashboardCounts = Record<string, number>;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://vinayaka-transport-api.vercel.app/api/v1";
const TOKEN_KEY = "vinayaka_admin_token";
const REFRESH_TOKEN_KEY = "vinayaka_admin_refresh_token";

async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export default function AdminPortalPage() {
  const [token, setToken] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<string>("");
  const [me, setMe] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  const [counts, setCounts] = useState<DashboardCounts>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [tripHistory, setTripHistory] = useState<TripHistory[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const [riderSearch, setRiderSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const deferredRiderSearch = useDeferredValue(riderSearch);
  const deferredCustomerSearch = useDeferredValue(customerSearch);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [newUser, setNewUser] = useState({ full_name: "", email: "", role: "operations_staff" as Role, phone: "" });
  const [newBranch, setNewBranch] = useState({ name: "", city: "", latitude: "", longitude: "", radius_km: "" });
  const [newRule, setNewRule] = useState({ branch_id: "", vehicle_type: "bike" as "bike" | "auto" | "car", base_fare: "", per_km_rate: "", min_fare: "", commission_percent: "", cod_enabled: true });

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
      setLoading(true);
      setError("");
      setNotice("");
      const profile = await api<{ user: AuthUser }>("/auth/me", {}, authToken);
      if (profile.user.role !== "admin") {
        throw new Error("Admin role required");
      }

      setMe(profile.user);
      await reloadAll(authToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to load admin portal";
      setError(message);
      if (refreshToken) {
        const ok = await refreshSession(refreshToken);
        if (ok) {
          return;
        }
      }
      clearSession();
    } finally {
      setLoading(false);
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
      const result = await api<{ access_token: string; refresh_token: string; user: AuthUser }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      });

      localStorage.setItem(TOKEN_KEY, result.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_token);
      setToken(result.access_token);
      setRefreshToken(result.refresh_token);
      setMe(result.user);
      return true;
    } catch {
      return false;
    }
  }

  async function requestWithRetry<T>(path: string, options: RequestInit = {}): Promise<T> {
    try {
      return await api<T>(path, options, token);
    } catch (err: unknown) {
      const typed = err as Error & { status?: number };
      if (typed.status === 401 && refreshToken) {
        const ok = await refreshSession(refreshToken);
        if (!ok) {
          clearSession();
          throw new Error("Session expired. Please login again.");
        }
        const latest = localStorage.getItem(TOKEN_KEY) ?? "";
        return await api<T>(path, options, latest);
      }

      throw err;
    }
  }

  async function reloadAll(authToken = token) {
    const [dashboard, branchData, ruleData, userData, driverData, bookingData, tripData, complaintData] = await Promise.all([
      authToken === token ? requestWithRetry<DashboardCounts>("/analytics/dashboard") : api<DashboardCounts>("/analytics/dashboard", {}, authToken),
      authToken === token ? requestWithRetry<Branch[]>("/branches") : api<Branch[]>("/branches", {}, authToken),
      authToken === token ? requestWithRetry<PricingRule[]>("/pricing_rules") : api<PricingRule[]>("/pricing_rules", {}, authToken),
      authToken === token ? requestWithRetry<AppUser[]>("/users") : api<AppUser[]>("/users", {}, authToken),
      authToken === token ? requestWithRetry<DriverRecord[]>("/drivers") : api<DriverRecord[]>("/drivers", {}, authToken),
      authToken === token ? requestWithRetry<{ items: BookingHistory[] }>("/bookings?page=1&limit=200") : api<{ items: BookingHistory[] }>("/bookings?page=1&limit=200", {}, authToken),
      authToken === token ? requestWithRetry<TripHistory[]>("/trips") : api<TripHistory[]>("/trips", {}, authToken),
      authToken === token ? requestWithRetry<Complaint[]>("/complaints") : api<Complaint[]>("/complaints", {}, authToken),
    ]);

    setCounts(dashboard);
    setBranches(branchData);
    setPricingRules(ruleData);
    setUsers(userData);
    setDrivers(driverData);
    setBookingHistory(bookingData.items ?? []);
    setTripHistory(tripData);
    setComplaints(complaintData);
  }

  async function ensureDefaultBranches() {
    try {
      setError("");
      const existing = new Set(branches.map((branch) => branch.name.trim().toLowerCase()));
      const defaults = [
        { name: "Nellore Hub", city: "Nellore", latitude: 14.4426, longitude: 79.9865, radius_km: 35 },
        { name: "Podalakur Hub", city: "Podalakur", latitude: 14.3844, longitude: 79.9267, radius_km: 20 },
        { name: "Tirupati Hub", city: "Tirupati", latitude: 13.6288, longitude: 79.4192, radius_km: 30 },
      ];

      for (const branch of defaults) {
        if (!existing.has(branch.name.toLowerCase())) {
          await requestWithRetry("/branches", {
            method: "POST",
            body: JSON.stringify(branch),
          });
        }
      }

      await reloadAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to create default branches";
      setError(message);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const result = await api<{ access_token: string; refresh_token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (result.user.role !== "admin") {
        throw new Error("Admin role required");
      }

      localStorage.setItem(TOKEN_KEY, result.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_token);
      setToken(result.access_token);
      setRefreshToken(result.refresh_token);
      setLoginPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
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
      setNotice("");
      await api<{ ok: boolean; message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotMessage("Reset link sent. Check your email inbox.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to send reset link";
      setError(message);
    }
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      setNotice("");
      const password = `Temp@${Date.now()}`;
      const created = await requestWithRetry<{ user: { id: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: newUser.full_name,
          email: newUser.email,
          password,
          phone: newUser.phone || undefined,
          role: newUser.role,
        }),
      });

      if (newUser.role === "driver") {
        await requestWithRetry("/drivers", {
          method: "POST",
          body: JSON.stringify({
            user_id: created.user.id,
            status: "available",
            is_approved: true,
          }),
        });
      }

      setNewUser({ full_name: "", email: "", role: "operations_staff", phone: "" });
  setNotice(`Temporary password for ${newUser.full_name}: ${password}`);
      await reloadAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to create user";
      setError(message);
    }
  }

  async function syncAndApproveRiders() {
    try {
      setError("");
      setNotice("");
      const riderUsers = users.filter((user) => user.role === "driver");
      const existingByUserId = new Map<string, DriverRecord>();
      for (const driver of drivers) {
        existingByUserId.set(driver.user_id, driver);
      }

      for (const rider of riderUsers) {
        const existing = existingByUserId.get(rider.id);
        if (!existing) {
          await requestWithRetry("/drivers", {
            method: "POST",
            body: JSON.stringify({
              user_id: rider.id,
              status: "available",
              is_approved: true,
            }),
          });
          continue;
        }

        if (!existing.is_approved || existing.status === "offline") {
          await requestWithRetry(`/drivers/${existing.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              is_approved: true,
              status: "available",
            }),
          });
        }
      }

      await reloadAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to sync rider profiles";
      setError(message);
    }
  }

  async function createBranch(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      setNotice("");
      await requestWithRetry("/branches", {
        method: "POST",
        body: JSON.stringify({
          name: newBranch.name,
          city: newBranch.city,
          latitude: Number(newBranch.latitude),
          longitude: Number(newBranch.longitude),
          radius_km: Number(newBranch.radius_km),
        }),
      });

      setNewBranch({ name: "", city: "", latitude: "", longitude: "", radius_km: "" });
      await reloadAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to create branch";
      setError(message);
    }
  }

  async function createPricingRule(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      setNotice("");
      await requestWithRetry("/pricing_rules", {
        method: "POST",
        body: JSON.stringify({
          branch_id: newRule.branch_id,
          vehicle_type: newRule.vehicle_type,
          base_fare: Number(newRule.base_fare),
          per_km_rate: Number(newRule.per_km_rate),
          min_fare: Number(newRule.min_fare),
          commission_percent: Number(newRule.commission_percent),
          cod_enabled: newRule.cod_enabled,
        }),
      });

      setNewRule({ branch_id: "", vehicle_type: "bike", base_fare: "", per_km_rate: "", min_fare: "", commission_percent: "", cod_enabled: true });
      await reloadAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to create pricing rule";
      setError(message);
    }
  }

  async function closeComplaint(id: string) {
    try {
      setError("");
      setNotice("");
      await requestWithRetry(`/complaints/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "closed" }),
      });
      await reloadAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to update complaint";
      setError(message);
    }
  }

  const totalRevenue = useMemo(() => counts.payments ?? 0, [counts]);

  const driverById = useMemo(() => {
    const map = new Map<string, DriverRecord>();
    for (const driver of drivers) {
      map.set(driver.id, driver);
    }
    return map;
  }, [drivers]);

  const today = new Date().toISOString().slice(0, 10);
  const riderAttendance = useMemo(() => {
    const present = new Set<string>();
    for (const trip of tripHistory) {
      if (!trip.driver_id || !trip.created_at?.startsWith(today)) {
        continue;
      }
      const driver = driverById.get(trip.driver_id);
      if (driver) {
        present.add(driver.user_id);
      }
    }
    return present;
  }, [tripHistory, driverById, today]);

  const customerAttendance = useMemo(() => {
    const present = new Set<string>();
    for (const booking of bookingHistory) {
      if (booking.created_at?.startsWith(today)) {
        present.add(booking.customer_user_id);
      }
    }
    return present;
  }, [bookingHistory, today]);

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

  const riderTripCount = (userId: string) => {
    const driverIds = drivers.filter((driver) => driver.user_id === userId).map((driver) => driver.id);
    if (!driverIds.length) {
      return 0;
    }
    return tripHistory.filter((trip) => trip.driver_id && driverIds.includes(trip.driver_id)).length;
  };

  const customerBookingCount = (userId: string, phone: string | null) => {
    return bookingHistory.filter((booking) => booking.customer_user_id === userId || (!!phone && booking.sender_phone === phone)).length;
  };

  async function resetUserPassword(userId: string, fullName: string) {
    try {
      setError("");
      setNotice("");
      const response = await requestWithRetry<{ temporary_password: string }>(`/users/${userId}/reset-password`, {
        method: "POST",
      });
      setNotice(`Temporary password for ${fullName}: ${response.temporary_password}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to reset password";
      setError(message);
    }
  }

  if (!token || !me) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[36px] border border-white/80 bg-white/80 shadow-[0_30px_90px_-40px_rgba(13,43,82,0.45)] backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-[linear-gradient(135deg,#0d2b52,#153b71)] px-6 py-8 text-white sm:px-8 lg:px-10">
              <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-200">Admin command center</p>
              <h1 className="mt-5 max-w-md text-4xl font-bold leading-tight">Manage riders, branches, pricing, and live activity with a polished dashboard shell.</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">Built for operations clarity: Indian branch setup, fast rider sync, and cleaner workflows for daily dispatch control.</p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.28)]">
                <h2 className="text-2xl font-bold text-slate-900">Admin login</h2>
                <p className="mt-2 text-sm text-slate-600">Secure access to users, branches, pricing, analytics, and complaints.</p>

                <form onSubmit={handleLogin} className="mt-6 grid gap-3">
                  <input required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" placeholder="Admin email" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
                  <input required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" placeholder="Password" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
                  <button disabled={loading} className="rounded-2xl bg-[linear-gradient(135deg,#49b857,#2b9545)] px-4 py-3 font-semibold text-white shadow-[0_16px_30px_-18px_rgba(73,184,87,0.8)]">{loading ? "Signing in..." : "Login"}</button>
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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">Admin overview</p>
              <h1 className="mt-2 text-3xl font-bold">Vinayaka Transport Control</h1>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-200">Users, riders, branches, pricing rules, complaints, and analytics in one upgraded dashboard.</p>
            </div>
            <button onClick={logout} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white">Logout</button>
          </div>
        </div>
        <div className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Logged in</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{me.full_name}</h2>
          <p className="mt-2 text-sm text-slate-600">Keep rider profiles approved, keep branches clean, and use this view as the main quality-control surface.</p>
        </div>
      </header>

      {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard title="Users" value={counts.users ?? 0} />
        <StatCard title="Drivers" value={counts.drivers ?? 0} />
        <StatCard title="Bookings" value={counts.bookings ?? 0} />
        <StatCard title="Payments" value={totalRevenue} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <form onSubmit={createUser} className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <h2 className="text-xl font-semibold">Create User</h2>
          <div className="mt-3 grid gap-2">
            <input required value={newUser.full_name} onChange={(event) => setNewUser((value) => ({ ...value, full_name: event.target.value }))} placeholder="Full name" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <input required type="email" value={newUser.email} onChange={(event) => setNewUser((value) => ({ ...value, email: event.target.value }))} placeholder="Email" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <input value={newUser.phone} onChange={(event) => setNewUser((value) => ({ ...value, phone: event.target.value }))} placeholder="Phone (e.g. +91XXXXXXXXXX)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <select aria-label="User role" value={newUser.role} onChange={(event) => setNewUser((value) => ({ ...value, role: event.target.value as Role }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <option value="admin">Admin</option>
              <option value="operations_staff">Operations Staff</option>
              <option value="driver">Driver</option>
              <option value="customer">Customer</option>
            </select>
            <button className="rounded-2xl bg-[linear-gradient(135deg,#49b857,#2b9545)] px-4 py-3 font-semibold text-white shadow-[0_16px_30px_-18px_rgba(73,184,87,0.8)]">Create User</button>
            <button type="button" onClick={syncAndApproveRiders} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900">Sync and Approve Rider Profiles</button>
          </div>
        </form>

        <form onSubmit={createBranch} className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <h2 className="text-xl font-semibold">Create Branch</h2>
          <div className="mt-3 grid gap-2">
            <input required value={newBranch.name} onChange={(event) => setNewBranch((value) => ({ ...value, name: event.target.value }))} placeholder="Branch name (e.g. Tirupati Hub)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <input required value={newBranch.city} onChange={(event) => setNewBranch((value) => ({ ...value, city: event.target.value }))} placeholder="City (Nellore / Podalakur / Tirupati)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" step="0.0001" value={newBranch.latitude} onChange={(event) => setNewBranch((value) => ({ ...value, latitude: event.target.value }))} placeholder="Latitude (e.g. 14.4426)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              <input required type="number" step="0.0001" value={newBranch.longitude} onChange={(event) => setNewBranch((value) => ({ ...value, longitude: event.target.value }))} placeholder="Longitude (e.g. 79.9865)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </div>
            <input required type="number" step="0.1" value={newBranch.radius_km} onChange={(event) => setNewBranch((value) => ({ ...value, radius_km: event.target.value }))} placeholder="Radius (km)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <button className="rounded-2xl bg-[linear-gradient(135deg,#49b857,#2b9545)] px-4 py-3 font-semibold text-white shadow-[0_16px_30px_-18px_rgba(73,184,87,0.8)]">Create Branch</button>
            <button type="button" onClick={ensureDefaultBranches} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900">Add Tirupati + Nellore + Podalakur</button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
        <h2 className="text-xl font-semibold">Pricing Rules</h2>
        <form onSubmit={createPricingRule} className="mt-3 grid gap-2 md:grid-cols-4">
          <select aria-label="Pricing branch" required value={newRule.branch_id} onChange={(event) => setNewRule((value) => ({ ...value, branch_id: event.target.value }))} className="rounded-md border px-3 py-2">
            <option value="">Select branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          <select aria-label="Vehicle type" value={newRule.vehicle_type} onChange={(event) => setNewRule((value) => ({ ...value, vehicle_type: event.target.value as "bike" | "auto" | "car" }))} className="rounded-md border px-3 py-2">
            <option value="bike">Bike</option>
            <option value="auto">Auto</option>
            <option value="car">Car</option>
          </select>
          <input required type="number" step="0.01" value={newRule.base_fare} onChange={(event) => setNewRule((value) => ({ ...value, base_fare: event.target.value }))} placeholder="Base fare" className="rounded-md border px-3 py-2" />
          <input required type="number" step="0.01" value={newRule.per_km_rate} onChange={(event) => setNewRule((value) => ({ ...value, per_km_rate: event.target.value }))} placeholder="Per km" className="rounded-md border px-3 py-2" />
          <input required type="number" step="0.01" value={newRule.min_fare} onChange={(event) => setNewRule((value) => ({ ...value, min_fare: event.target.value }))} placeholder="Min fare" className="rounded-md border px-3 py-2" />
          <input required type="number" step="0.01" value={newRule.commission_percent} onChange={(event) => setNewRule((value) => ({ ...value, commission_percent: event.target.value }))} placeholder="Commission %" className="rounded-md border px-3 py-2" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={newRule.cod_enabled} onChange={(event) => setNewRule((value) => ({ ...value, cod_enabled: event.target.checked }))} />
            COD Enabled
          </label>
          <button className="rounded-md bg-ocean px-4 py-2 font-semibold text-white">Add Rule</button>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Branch</th>
                <th className="py-2">Vehicle</th>
                <th className="py-2">Base</th>
                <th className="py-2">Per km</th>
                <th className="py-2">Min</th>
                <th className="py-2">Commission</th>
              </tr>
            </thead>
            <tbody>
              {pricingRules.map((rule) => (
                <tr key={rule.id} className="border-b">
                  <td className="py-2">{branches.find((branch) => branch.id === rule.branch_id)?.name ?? rule.branch_id}</td>
                  <td className="py-2 uppercase">{rule.vehicle_type}</td>
                  <td className="py-2">{rule.base_fare}</td>
                  <td className="py-2">{rule.per_km_rate}</td>
                  <td className="py-2">{rule.min_fare}</td>
                  <td className="py-2">{rule.commission_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <h2 className="text-xl font-semibold">Users</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">{user.full_name}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2 capitalize">{user.role.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
          <h2 className="text-xl font-semibold">Complaints</h2>
          <div className="mt-3 grid gap-3">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{complaint.title}</h3>
                  <span className="text-xs uppercase">{complaint.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{complaint.description}</p>
                <button onClick={() => closeComplaint(complaint.id)} className="mt-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900">Close</button>
              </div>
            ))}
            {complaints.length === 0 ? <p className="text-sm text-slate-600">No complaints found.</p> : null}
          </div>
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
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {riderUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">{user.full_name}</td>
                    <td className="py-2">{user.phone ?? "-"}</td>
                    <td className="py-2">{riderTripCount(user.id)}</td>
                    <td className="py-2">{riderAttendance.has(user.id) ? "Present" : "Absent"}</td>
                    <td className="py-2 text-right"><button onClick={() => resetUserPassword(user.id, user.full_name)} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900">Reset Password</button></td>
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

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(13,43,82,0.22)]">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
