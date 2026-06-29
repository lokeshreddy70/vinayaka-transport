'use client'

import { useState } from 'react'

type FleetVehicle = {
  id: string
  type: string
  number: string
  active: boolean
}

const seed: FleetVehicle[] = [
  { id: 'v1', type: 'Bike', number: 'AP 39 AB 1201', active: true },
  { id: 'v2', type: 'Auto', number: 'AP 39 AB 4545', active: true },
  { id: 'v3', type: 'Mini Truck', number: 'AP 39 AB 7800', active: false },
]

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(seed)

  return (
    <main className="min-h-screen bg-[#F7FAFF] px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fleet Management</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Vehicle Control</h1>
          <p className="mt-1 text-sm text-slate-500">Track active fleet inventory and availability in real-time.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <article key={vehicle.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{vehicle.type}</p>
                  <p className="text-xs text-slate-500">{vehicle.number}</p>
                </div>
                <button
                  onClick={() => setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? { ...v, active: !v.active } : v)))}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${vehicle.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}
                >
                  {vehicle.active ? 'Active' : 'Inactive'}
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
