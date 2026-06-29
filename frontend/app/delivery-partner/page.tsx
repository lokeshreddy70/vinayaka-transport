'use client'

import { useMemo, useState } from 'react'
import { MapPin, Phone, ShieldAlert } from 'lucide-react'
import { getDemoOrders, updateDemoOrderStatus } from '@/lib/customer-api'

export default function DeliveryPartnerPage() {
  const [message, setMessage] = useState('')
  const orders = getDemoOrders()
  const active = useMemo(
    () => orders.filter((item) => !['DELIVERED', 'CANCELLED'].includes(String(item.status).toUpperCase())),
    [orders]
  )

  function markDelivered(orderId: string) {
    updateDemoOrderStatus(orderId, 'DELIVERED')
    setMessage('Order marked as delivered')
  }

  return (
    <main className="min-h-screen bg-[#F4F8FF] px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Delivery Partner</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Active Deliveries</h1>
          <p className="mt-1 text-sm text-slate-500">Accept jobs, navigate, call customer, and complete delivery.</p>
        </section>

        <section className="grid gap-3">
          {active.map((order) => (
            <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{order.orderNumber}</p>
              <p className="mt-1 text-xs text-slate-500">{order.pickupAddress?.fullAddress || 'Pickup'} to {order.dropAddress?.fullAddress || 'Drop'}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <button onClick={() => updateDemoOrderStatus(order.id, 'ASSIGNED')} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Accept</button>
                <button onClick={() => updateDemoOrderStatus(order.id, 'PICKED_UP')} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Start</button>
                <a href="tel:+919876543210" className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Phone className="h-3.5 w-3.5" />Call</a>
                <button onClick={() => markDelivered(order.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Complete</button>
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600"><MapPin className="h-3 w-3" />Navigate</span>
                <a href="tel:112" className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-rose-700"><ShieldAlert className="h-3 w-3" />SOS</a>
              </div>
            </article>
          ))}
          {active.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No active deliveries.</p> : null}
        </section>

        {message ? <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</p> : null}
      </div>
    </main>
  )
}
