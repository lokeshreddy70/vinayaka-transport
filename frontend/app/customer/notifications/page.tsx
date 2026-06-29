'use client'

import { useState } from 'react'

const seed = [
  { id: 'n1', title: 'Order Accepted', message: 'Driver assigned for your booking VT-2026-840135', read: false },
  { id: 'n2', title: 'Offer Unlocked', message: 'Use VINAYAKA20 on your next 3 rides', read: false },
  { id: 'n3', title: 'Wallet Updated', message: 'Cashback credited to wallet balance', read: true },
]

export default function CustomerNotificationsPage() {
  const [items, setItems] = useState(seed)

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time alerts for bookings, offers, and wallet activities.</p>

          <div className="mt-4 space-y-2">
            {items.map((item) => (
              <article key={item.id} className={`rounded-xl border px-3 py-3 ${item.read ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'}`}>
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-600">{item.message}</p>
                {!item.read ? (
                  <button onClick={() => setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, read: true } : row)))} className="mt-2 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Mark Read</button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
