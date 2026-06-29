'use client'

import { useMemo, useState } from 'react'
import { getDemoOrders } from '@/lib/customer-api'

export default function VendorPortalPage() {
  const [filter, setFilter] = useState('ALL')
  const [message, setMessage] = useState('')
  const orders = getDemoOrders()

  const rows = useMemo(() => {
    if (filter === 'ALL') {
      return orders
    }
    return orders.filter((item) => String(item.status).toUpperCase() === filter)
  }, [orders, filter])

  return (
    <main className="min-h-screen bg-[#F7FAFF] px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Vendor Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Order Fulfillment</h1>
          <p className="mt-1 text-sm text-slate-500">Manage incoming parcel requests and dispatch operations.</p>
          <div className="mt-3 flex gap-2">
            {['ALL', 'PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'].map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${filter === item ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            {rows.map((order) => (
              <article key={order.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">{order.pickupAddress?.fullAddress || 'Pickup'} to {order.dropAddress?.fullAddress || 'Drop'}</p>
                </div>
                <p className="text-sm font-semibold text-emerald-600">{order.finalPrice.toFixed(2)}</p>
                <button onClick={() => setMessage(`Dispatch prepared for ${order.orderNumber}`)} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Prepare Dispatch</button>
              </article>
            ))}
            {rows.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">No orders for this filter.</p> : null}
          </div>
        </section>

        {message ? <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</p> : null}
      </div>
    </main>
  )
}
