'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Bike,
  Car,
  Package,
  Search,
  Truck,
} from 'lucide-react'
import {
  ACCESS_TOKEN_KEY,
  fetchCustomerOrders,
  fetchCustomerProfile,
  getCustomerName,
  type CustomerProfile,
  type Order,
} from '@/lib/customer-api'
import { CustomerBottomNav } from '@/components/customer/BottomNav'

const vehicles = [
  { label: 'Bike', fare: '25/km', icon: Bike },
  { label: 'Auto', fare: '45/km', icon: Car },
  { label: 'Cab', fare: '120/km', icon: Car },
  { label: 'Mini Truck', fare: '350/km', icon: Truck },
]

const shortcuts = [
  { label: 'Courier', icon: Package },
  { label: 'Parcel', icon: Package },
  { label: 'Delivery', icon: Truck },
  { label: 'Rentals', icon: Car },
]

export default function CustomerHomePage() {
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
        // Keep session until manual logout.
      })
      .finally(() => setLoading(false))
  }, [router])

  const activeOrder = useMemo(
    () => orders.find((item) => !['DELIVERED', 'CANCELLED'].includes(String(item.status).toUpperCase())),
    [orders]
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-[#eef3fb] px-4 py-6">
        <div className="mx-auto max-w-md space-y-3">
          <div className="h-20 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#eef3fb] pb-24">
      <div className="mx-auto w-full max-w-md px-4 py-5">
        <section className="rounded-[30px] border border-[#e7edf7] bg-white px-4 py-4 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-[#6b7280]">Good Morning,</p>
              <h1 className="mt-0.5 text-lg font-bold text-[#0f172a]">{getCustomerName(profile)} <span className="text-base">👋</span></h1>
            </div>
            <button
              title="Open notifications"
              onClick={() => router.push('/customer/notifications')}
              className="rounded-full border border-[#dbe5f4] bg-white p-2 text-[#334155]"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => router.push('/customer/book')}
            className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-left"
          >
            <Search className="h-4 w-4 text-[#64748b]" />
            <span className="text-sm text-[#64748b]">Where do you want to go?</span>
          </button>

          <div className="mt-3 overflow-hidden rounded-3xl border border-[#e2e8f0] bg-[linear-gradient(170deg,#f8fbff,#eef4ff)] p-3">
            <div className="relative h-36 rounded-2xl border border-white/70 bg-[radial-gradient(circle_at_30%_25%,rgba(37,99,235,0.11),transparent_38%),radial-gradient(circle_at_75%_78%,rgba(14,165,233,0.14),transparent_38%),#f4f7fc]">
              <div className="absolute left-5 top-8 h-3 w-3 rounded-full bg-[#f59e0b]" />
              <div className="absolute right-8 top-14 h-3 w-3 rounded-full bg-[#0ea5e9]" />
              <div className="absolute bottom-8 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full border-4 border-[#3b82f6]/25 bg-[#2563eb]" />
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[30px] border border-[#e7edf7] bg-white px-4 py-4 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.4)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0f172a]">Book a Ride Now</h2>
            <Link href="/customer/book" className="text-xs font-semibold text-[#2563eb]">See All</Link>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.label}
                onClick={() => router.push(`/customer/book?vehicle=${encodeURIComponent(vehicle.label)}`)}
                className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-2 py-2 text-center"
              >
                <vehicle.icon className="mx-auto h-4 w-4 text-[#1d4ed8]" />
                <p className="mt-1 text-[11px] font-semibold text-[#111827]">{vehicle.label}</p>
                <p className="text-[10px] text-[#64748b]">{vehicle.fare}</p>
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {shortcuts.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push('/customer/book')}
                className="rounded-xl border border-[#e2e8f0] bg-white px-2 py-2 text-center"
              >
                <item.icon className="mx-auto h-4 w-4 text-[#2563eb]" />
                <p className="mt-1 text-[10px] font-semibold text-[#334155]">{item.label}</p>
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => router.push('/customer/book')} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-left">
              <p className="text-[11px] font-semibold text-[#0f172a]">Airport Ride</p>
              <p className="text-[10px] text-[#64748b]">Fixed Price</p>
            </button>
            <button onClick={() => router.push('/customer/book')} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-left">
              <p className="text-[11px] font-semibold text-[#0f172a]">Schedule Ride</p>
              <p className="text-[10px] text-[#64748b]">Book in advance</p>
            </button>
          </div>

          <button
            onClick={() => router.push('/customer/offers')}
            className="mt-3 block w-full rounded-2xl bg-[linear-gradient(115deg,#0a4cca,#1d6ce6)] px-3 py-3 text-left text-white"
          >
            <p className="text-xs font-semibold">Flat 20% OFF on your first 3 rides!</p>
            <p className="mt-0.5 text-[11px] text-blue-100">Use Code: VINAYAKA20</p>
          </button>
        </section>

        {activeOrder ? (
          <section className="mt-4 rounded-[24px] border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
            <p className="text-xs font-semibold text-[#475569]">Active Trip</p>
            <p className="mt-1 text-sm font-bold text-[#0f172a]">{activeOrder.orderNumber}</p>
            <button onClick={() => router.push(`/customer/tracking?order=${encodeURIComponent(activeOrder.orderNumber)}`)} className="mt-2 rounded-xl bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white">Track Live</button>
          </section>
        ) : null}

        <section className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/customer/wallet" className="rounded-2xl border border-[#e2e8f0] bg-white px-3 py-3 text-center text-xs font-semibold text-[#1e293b]">
            Wallet
          </Link>
          <Link href="/customer/profile" className="rounded-2xl border border-[#e2e8f0] bg-white px-3 py-3 text-center text-xs font-semibold text-[#1e293b]">
            Profile
          </Link>
        </section>
      </div>
      <CustomerBottomNav />
    </main>
  )
}
