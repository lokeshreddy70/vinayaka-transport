'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Bike, Car, Truck, LocateFixed, Search, Clock3, IndianRupee } from 'lucide-react'
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  fetchCustomerOrders,
  fetchCustomerProfile,
  getCustomerName,
  type Order,
  type CustomerProfile,
} from '@/lib/customer-api'
import { CustomerBottomNav } from '@/components/customer/BottomNav'

const vehicles = [
  { label: 'Bike', icon: Bike },
  { label: 'Auto', icon: Car },
  { label: 'Mini Truck', icon: Truck },
  { label: 'Pickup Truck', icon: Truck },
  { label: 'Lorry', icon: Truck },
]

const routes = [
  'Nellore -> Podalakur',
  'Nellore -> Tirupati',
  'Nellore -> Kavali',
]

export default function CustomerDashboardV3() {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      router.replace('/customer/login')
      return
    }

    Promise.all([fetchCustomerProfile(token), fetchCustomerOrders(token)])
      .then(([p, o]) => {
        setProfile(p)
        setOrders(o)
      })
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.localStorage.removeItem(REFRESH_TOKEN_KEY)
        router.replace('/customer/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  const activeOrder = useMemo(
    () => orders.find((item) => !['DELIVERED', 'CANCELLED', 'delivered', 'cancelled'].includes(item.status)),
    [orders]
  )

  const handleQuickTrack = (orderNumber: string) => {
    router.push(`/customer/tracking?order=${encodeURIComponent(orderNumber)}`)
  }

  if (loading) {
    return <div className="min-h-screen bg-[#F8FAFC] px-6 py-10 text-[#0A2540]">Loading customer app...</div>
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0A2540] via-[#123A5E] to-[#0B2D4A] p-6 text-white shadow-[0_30px_80px_-30px_rgba(10,37,64,0.7)] md:p-8">
          <p className="text-sm uppercase tracking-[0.26em] text-slate-200">Vinayaka Customer App</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">
            Good Morning, {getCustomerName(profile)} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
            Book hyperlocal and intercity transport in seconds. Live tracking, transparent fare, and branch-grade reliability.
          </p>

          <div className="mt-6 grid gap-4 rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur md:grid-cols-4">
            <label className="rounded-2xl bg-white/90 px-3 py-2 text-sm text-slate-800">
              Pickup
              <input className="mt-1 w-full border-none bg-transparent p-0 text-sm font-semibold text-slate-900 focus:outline-none" placeholder="Enter pickup" />
            </label>
            <label className="rounded-2xl bg-white/90 px-3 py-2 text-sm text-slate-800">
              Drop
              <input className="mt-1 w-full border-none bg-transparent p-0 text-sm font-semibold text-slate-900 focus:outline-none" placeholder="Enter destination" />
            </label>
            <label className="rounded-2xl bg-white/90 px-3 py-2 text-sm text-slate-800">
              Vehicle
              <select className="mt-1 w-full border-none bg-transparent p-0 text-sm font-semibold text-slate-900 focus:outline-none" defaultValue="Bike" aria-label="Vehicle selection">
                {vehicles.map((vehicle) => (
                  <option key={vehicle.label}>{vehicle.label}</option>
                ))}
              </select>
            </label>
            <Link href="/customer/book" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e55f00]">
              <Search className="h-4 w-4" />
              Quick Book
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-35px_rgba(10,37,64,0.35)] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#0A2540] md:text-xl">Active Order</h2>
              <Link href="/customer/orders" className="text-sm font-semibold text-[#0A2540]">All orders</Link>
            </div>

            {activeOrder ? (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm text-slate-600">Order ID</p>
                <p className="text-xl font-bold text-[#0A2540]">{activeOrder.orderNumber}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#FF6B00]" />Status: {activeOrder.status}</p>
                  <p className="inline-flex items-center gap-2"><IndianRupee className="h-4 w-4 text-[#16A34A]" />Fare: {activeOrder.finalPrice.toFixed(2)}</p>
                </div>
                <button onClick={() => handleQuickTrack(activeOrder.orderNumber)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white">
                  Live Tracking
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
                No active orders. Book a delivery now to start live tracking.
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-35px_rgba(10,37,64,0.35)] md:p-6">
            <h2 className="text-lg font-bold text-[#0A2540] md:text-xl">Popular Routes</h2>
            <ul className="mt-4 space-y-3">
              {routes.map((route) => (
                <li key={route} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-2"><LocateFixed className="h-4 w-4 text-[#FF6B00]" />{route}</span>
                  <Link href="/customer/book" className="text-[#0A2540]">Book Again</Link>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-35px_rgba(10,37,64,0.35)] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#0A2540] md:text-xl">Recent Orders</h2>
            <Link href="/customer/orders" className="text-sm font-semibold text-[#0A2540]">Open history</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {orders.slice(0, 5).map((order) => (
              <Link key={order.id} href={`/customer/orders/${order.id}`} className="grid grid-cols-[1fr_auto] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 hover:border-slate-300">
                <div>
                  <p className="text-sm font-bold text-[#0A2540]">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#16A34A]">{order.finalPrice.toFixed(2)}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{order.status}</p>
                </div>
              </Link>
            ))}
            {orders.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">No orders yet.</p> : null}
          </div>
        </section>
      </div>
      <CustomerBottomNav />
    </main>
  )
}


