'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bike,
  Car,
  Clock3,
  IndianRupee,
  LocateFixed,
  MapPinned,
  Package,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import {
  ACCESS_TOKEN_KEY,
  fetchCustomerOrders,
  fetchCustomerProfile,
  getCustomerName,
  type Order,
  type CustomerProfile,
} from '@/lib/customer-api'
import { CustomerBottomNav } from '@/components/customer/BottomNav'

const vehicles = [
  { label: 'Bike', icon: Bike, eta: '2 min', fare: '25/km' },
  { label: 'Auto', icon: Car, eta: '4 min', fare: '45/km' },
  { label: 'Cab', icon: Car, eta: '5 min', fare: '120/km' },
  { label: 'Mini Truck', icon: Truck, eta: '7 min', fare: '350/km' },
]

const quickServices = [
  { label: 'Courier', icon: Package },
  { label: 'Parcel', icon: Package },
  { label: 'Delivery', icon: Truck },
  { label: 'Rentals', icon: Car },
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
        // Keep session until the user logs out manually.
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
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-6">
        <div className="mx-auto grid w-full max-w-md gap-3">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto w-full max-w-md px-4 py-5 md:max-w-6xl md:px-8 md:py-8">
        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-[0_28px_56px_-38px_rgba(15,23,42,0.4)] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B7280]">Good Morning</p>
              <h1 className="mt-1 text-2xl font-bold text-[#111827] md:text-3xl">{getCustomerName(profile)}</h1>
            </div>
            <span className="rounded-xl bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1D4ED8]">Live</span>
          </div>

          <label className="mt-4 flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
            <Search className="h-4 w-4 text-[#6B7280]" />
            <input
              className="w-full border-none bg-transparent text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
              placeholder="Where do you want to go?"
            />
          </label>

          <div className="mt-4 overflow-hidden rounded-3xl border border-[#E5E7EB] bg-[linear-gradient(145deg,#DBEAFE,#F8FAFC_48%,#E0F2FE)] p-4">
            <div className="relative h-40 rounded-2xl border border-white/70 bg-white/50 p-3 backdrop-blur">
              <p className="text-xs font-semibold text-[#0F172A]">Live map preview</p>
              <p className="mt-1 text-xs text-[#64748B]">Nearby vehicles and smart ETA hints</p>
              <div className="absolute left-7 top-20 h-3 w-3 rounded-full bg-[#10B981]" />
              <div className="absolute right-10 top-14 h-3 w-3 rounded-full bg-[#1D4ED8]" />
              <div className="absolute bottom-8 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full border-4 border-[#2563EB]/20 bg-[#2563EB]" />
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111827] md:text-lg">Book a Ride Now</h2>
            <Link href="/customer/book" className="text-sm font-semibold text-[#2563EB]">See all</Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {vehicles.map(({ label, icon: Icon, eta, fare }) => (
              <Link key={label} href="/customer/book" className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF]">
                <Icon className="h-5 w-5 text-[#1D4ED8]" />
                <p className="mt-2 text-sm font-semibold text-[#111827]">{label}</p>
                <p className="text-xs text-[#64748B]">{eta}</p>
                <p className="text-xs font-medium text-[#10B981]">{fare}</p>
              </Link>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {quickServices.map(({ label, icon: Icon }) => (
              <Link key={label} href="/customer/book" className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#334155]">
                <Icon className="h-4 w-4 text-[#2563EB]" />
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#111827]">Active Trip</h3>
              <MapPinned className="h-4 w-4 text-[#2563EB]" />
            </div>

            {activeOrder ? (
              <div className="mt-3 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-3">
                <p className="text-sm font-semibold text-[#111827]">{activeOrder.orderNumber}</p>
                <p className="mt-1 inline-flex items-center gap-2 text-xs text-[#475569]"><Clock3 className="h-3.5 w-3.5" />{activeOrder.status}</p>
                <p className="mt-1 inline-flex items-center gap-2 text-xs text-[#059669]"><IndianRupee className="h-3.5 w-3.5" />{activeOrder.finalPrice.toFixed(2)}</p>
                <button onClick={() => handleQuickTrack(activeOrder.orderNumber)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white">
                  Track live
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-dashed border-[#CBD5E1] px-3 py-5 text-sm text-[#64748B]">No active trip. Start a booking to see live updates.</p>
            )}
          </article>

          <article className="rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.35)]">
            <h3 className="text-base font-bold text-[#111827]">Safety & Assurance</h3>
            <div className="mt-3 space-y-2 text-sm text-[#334155]">
              <p className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#10B981]" />Verified riders and secured trips</p>
              <p className="inline-flex items-center gap-2"><LocateFixed className="h-4 w-4 text-[#2563EB]" />Live GPS route visibility</p>
              <p className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-[#F59E0B]" />Proof-of-delivery on every order</p>
            </div>

            <div className="mt-4 rounded-2xl bg-[linear-gradient(130deg,#1D4ED8,#06B6D4)] p-3 text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Offer</p>
              <p className="mt-1 text-lg font-bold">20% OFF on 3 rides</p>
              <p className="mt-1 text-xs text-blue-100">Use code VINAYAKA20</p>
            </div>
          </article>
        </section>

        <section className="mt-5 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111827] md:text-lg">Recent Orders</h2>
            <Link href="/customer/orders" className="text-sm font-semibold text-[#2563EB]">View all</Link>
          </div>
          <div className="mt-3 space-y-2">
            {orders.slice(0, 4).map((order) => (
              <Link key={order.id} href={`/customer/orders/${order.id}`} className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{order.orderNumber}</p>
                  <p className="text-xs text-[#64748B]">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#10B981]">{order.finalPrice.toFixed(2)}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#64748B]">{order.status}</p>
                </div>
              </Link>
            ))}
            {orders.length === 0 ? <p className="rounded-2xl border border-dashed border-[#CBD5E1] px-3 py-6 text-center text-sm text-[#64748B]">No orders yet.</p> : null}
          </div>
        </section>
      </div>
      <CustomerBottomNav />
    </main>
  )
}


