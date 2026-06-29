'use client'

import { useMemo } from 'react'
import { getDemoOrders, getDemoWallet } from '@/lib/customer-api'

export default function SuperAdminPage() {
  const orders = getDemoOrders()
  const wallet = getDemoWallet()

  const summary = useMemo(() => {
    const revenue = orders.reduce((sum, item) => sum + Number(item.finalPrice || 0), 0)
    const delivered = orders.filter((item) => String(item.status).toUpperCase() === 'DELIVERED').length
    return { revenue, delivered }
  }, [orders])

  return (
    <main className="min-h-screen bg-[#F5F8FF] px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Super Admin Panel</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Global Platform Governance</h1>
          <p className="mt-1 text-sm text-slate-500">Cross-portal health, revenue, wallets, and operations visibility.</p>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <Card title="Total Orders" value={String(orders.length)} />
          <Card title="Delivered" value={String(summary.delivered)} />
          <Card title="Revenue" value={summary.revenue.toFixed(2)} />
          <Card title="Wallet Float" value={wallet.balance.toFixed(2)} />
        </section>
      </div>
    </main>
  )
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  )
}
