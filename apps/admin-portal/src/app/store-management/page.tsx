"use client";

import { FormEvent, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://vinayaka-transport-api.vercel.app/api/v1";
const TOKEN_KEY = "vinayaka_admin_token";

type Branch = { id: string; name: string };
type InventoryItem = { id: string; branch_id: string; item_name: string; category: string; quantity: number; low_stock_threshold: number };
type Compliance = { id: string; vehicle_id: string | null; insurance_expiry: string | null; fc_expiry: string | null; pollution_expiry: string | null };
type Attendance = { id: string; attendance_date: string; status: string; driver_id: string | null };

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

export default function StoreManagementPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [compliance, setCompliance] = useState<Compliance[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [inventoryForm, setInventoryForm] = useState({ item_name: "", category: "", quantity: "0", low_stock_threshold: "5" });
  const [attendanceForm, setAttendanceForm] = useState({ driver_id: "", attendance_date: "", status: "present" });

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY) ?? "";
    setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadAll(token);
  }, [token]);

  async function loadAll(authToken = token) {
    try {
      setError("");
      const [branchData, inventoryData, complianceData, attendanceData] = await Promise.all([
        api<Branch[]>("/branches", authToken),
        api<InventoryItem[]>("/inventory_items", authToken),
        api<Compliance[]>("/vehicle_compliance", authToken),
        api<Attendance[]>("/driver_attendance", authToken),
      ]);

      setBranches(branchData);
      setSelectedBranch((previous) => previous || branchData[0]?.id || "");
      setInventory(inventoryData);
      setCompliance(complianceData);
      setAttendance(attendanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load store management");
    }
  }

  async function createInventory(event: FormEvent) {
    event.preventDefault();
    if (!selectedBranch) {
      setError("Select a branch first");
      return;
    }

    try {
      await api("/inventory_items", token, {
        method: "POST",
        body: JSON.stringify({
          branch_id: selectedBranch,
          item_name: inventoryForm.item_name,
          category: inventoryForm.category,
          quantity: Number(inventoryForm.quantity),
          low_stock_threshold: Number(inventoryForm.low_stock_threshold),
        }),
      });

      setInventoryForm({ item_name: "", category: "", quantity: "0", low_stock_threshold: "5" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create inventory item");
    }
  }

  async function createAttendance(event: FormEvent) {
    event.preventDefault();
    if (!selectedBranch) {
      setError("Select a branch first");
      return;
    }

    try {
      await api("/driver_attendance", token, {
        method: "POST",
        body: JSON.stringify({
          branch_id: selectedBranch,
          driver_id: attendanceForm.driver_id || null,
          attendance_date: attendanceForm.attendance_date,
          status: attendanceForm.status,
        }),
      });

      setAttendanceForm({ driver_id: "", attendance_date: "", status: "present" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save attendance");
    }
  }

  const branchInventory = inventory.filter((item) => !selectedBranch || item.branch_id === selectedBranch);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[36px] border border-white/80 bg-white/80 p-5 shadow-[0_30px_90px_-40px_rgba(13,43,82,0.45)] backdrop-blur sm:p-6">
        <div className="rounded-[32px] bg-[linear-gradient(135deg,#0d2b52,#153b71)] px-6 py-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">Branch ERP</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">Store and branch management command center.</h1>
          <p className="mt-3 text-sm text-slate-200">Manage inventory, vehicle compliance, and rider attendance with branch-level visibility.</p>
        </div>

        <div className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500" htmlFor="branch-selector">Branch</label>
          <select id="branch-selector" aria-label="Select branch" value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <option value="">Select branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[26px] border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold text-slate-900">Inventory Management</h2>
            <form onSubmit={createInventory} className="mt-4 grid gap-3">
              <input required value={inventoryForm.item_name} onChange={(event) => setInventoryForm((prev) => ({ ...prev, item_name: event.target.value }))} placeholder="Item name" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              <input required value={inventoryForm.category} onChange={(event) => setInventoryForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" value={inventoryForm.quantity} onChange={(event) => setInventoryForm((prev) => ({ ...prev, quantity: event.target.value }))} placeholder="Quantity" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
                <input required type="number" value={inventoryForm.low_stock_threshold} onChange={(event) => setInventoryForm((prev) => ({ ...prev, low_stock_threshold: event.target.value }))} placeholder="Low stock alert" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              </div>
              <button className="rounded-2xl bg-[linear-gradient(135deg,#49b857,#2b9545)] px-4 py-3 font-semibold text-white">Add inventory item</button>
            </form>

            <ul className="mt-4 grid gap-2">
              {branchInventory.slice(0, 8).map((item) => (
                <li key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.item_name}</p>
                    <p className={`text-xs font-semibold ${item.quantity <= item.low_stock_threshold ? "text-red-600" : "text-emerald-600"}`}>
                      {item.quantity <= item.low_stock_threshold ? "LOW STOCK" : "IN STOCK"}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.category} • Qty: {item.quantity}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[26px] border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold text-slate-900">Driver Attendance</h2>
            <form onSubmit={createAttendance} className="mt-4 grid gap-3">
              <input value={attendanceForm.driver_id} onChange={(event) => setAttendanceForm((prev) => ({ ...prev, driver_id: event.target.value }))} placeholder="Driver id (optional)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              <input required type="date" aria-label="Attendance date" value={attendanceForm.attendance_date} onChange={(event) => setAttendanceForm((prev) => ({ ...prev, attendance_date: event.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              <select aria-label="Attendance status" value={attendanceForm.status} onChange={(event) => setAttendanceForm((prev) => ({ ...prev, status: event.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
              </select>
              <button className="rounded-2xl bg-[linear-gradient(135deg,#f59c3d,#ef7c2b)] px-4 py-3 font-semibold text-white">Save attendance</button>
            </form>

            <ul className="mt-4 grid gap-2">
              {attendance.slice(0, 8).map((entry) => (
                <li key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {entry.attendance_date} • {entry.status.toUpperCase()} • Driver: {entry.driver_id || "Not linked"}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <article className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-900">Vehicle Compliance</h2>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {compliance.slice(0, 10).map((entry) => (
              <li key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Vehicle: {entry.vehicle_id || "Unmapped"} • Insurance: {entry.insurance_expiry || "-"} • FC: {entry.fc_expiry || "-"} • Pollution: {entry.pollution_expiry || "-"}
              </li>
            ))}
            {compliance.length === 0 ? <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">No compliance records found yet.</li> : null}
          </ul>
        </article>

        {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
