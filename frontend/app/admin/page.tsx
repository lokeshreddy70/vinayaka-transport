'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Car,
  CircleDollarSign,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'
import { getDemoOrders, getDemoWallet, type Order } from '@/lib/customer-api'

type DashboardTab =
  | 'dashboard'
  | 'bookings'
  | 'drivers'
  | 'customers'
  | 'earnings'
  | 'vehicles'
  | 'offers'
  | 'reports'
  | 'settings'

type ManagedDriver = {
  id: string
  name: string
  phone: string
  isOnline: boolean
  rating: number
}

const DRIVER_STORE = 'vinayaka_admin_drivers'

function getDrivers(): ManagedDriver[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(DRIVER_STORE)
  if (raw) {
    try {
      return JSON.parse(raw) as ManagedDriver[]
    } catch {
      return []
    }
  }

  const seed: ManagedDriver[] = [
    { id: 'd-1', name: 'Ramesh Kumar', phone: '+91 90000 12221', isOnline: true, rating: 4.8 },
    { id: 'd-2', name: 'Arun K', phone: '+91 90000 13331', isOnline: false, rating: 4.6 },
    { id: 'd-3', name: 'Priya V', phone: '+91 90000 14441', isOnline: true, rating: 4.7 },
  ]
  window.localStorage.setItem(DRIVER_STORE, JSON.stringify(seed))
  return seed
}

function setDrivers(drivers: ManagedDriver[]) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(DRIVER_STORE, JSON.stringify(drivers))
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard')
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDriversState] = useState<ManagedDriver[]>([])
  const [message, setMessage] = useState('')
  const [offerCode, setOfferCode] = useState('VINAYAKA20')
  const [offerDiscount, setOfferDiscount] = useState('20')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  useEffect(() => {
    setOrders(getDemoOrders())
    setDriversState(getDrivers())
  }, [])

  const stats = useMemo(() => {
    const wallet = getDemoWallet()
    const delivered = orders.filter((item) => String(item.status).toUpperCase() === 'DELIVERED')
    const totalRevenue = orders.reduce((sum, item) => sum + Number(item.finalPrice || 0), 0)

    return {
      totalBookings: orders.length,
      totalEarnings: totalRevenue,
      onlineDrivers: drivers.filter((d) => d.isOnline).length,
      totalCustomers: Math.max(orders.length, 1),
      deliveredCount: delivered.length,
      walletBalance: wallet.balance,
    }
  }, [orders, drivers])

  const bookingsByHour = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0]
    orders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours()
      const index = Math.min(5, Math.floor(hour / 4))
      buckets[index] += 1
    })
    return buckets
  }, [orders])

  const bookingBarClass = (value: number): string => {
    if (value >= 6) return 'h-40'
    if (value >= 5) return 'h-32'
    if (value >= 4) return 'h-28'
    if (value >= 3) return 'h-24'
    if (value >= 2) return 'h-16'
    if (value >= 1) return 'h-12'
    return 'h-4'
  }

  const menuItems: Array<{ id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: Receipt },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'earnings', label: 'Earnings', icon: CircleDollarSign },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'offers', label: 'Offers', icon: Megaphone },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  function toggleDriverStatus(driverId: string) {
    const next = drivers.map((driver) =>
      driver.id === driverId ? { ...driver, isOnline: !driver.isOnline } : driver
    )
    setDriversState(next)
    setDrivers(next)
    setMessage('Driver status updated successfully')
  }

  function saveOffer() {
    window.localStorage.setItem(
      'vinayaka_active_offer',
      JSON.stringify({ code: offerCode.trim(), discount: Number(offerDiscount || 0) })
    )
    setMessage(`Offer ${offerCode.trim()} saved with ${offerDiscount}% discount`)
  }

  function exportReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      stats,
      orders,
      drivers,
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'vinayaka-admin-report.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Report exported successfully')
  }

  function renderContent() {
    if (activeTab === 'dashboard') {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Total Bookings" value={String(stats.totalBookings)} delta="+12.5%" />
            <StatCard title="Total Earnings" value={`${stats.totalEarnings.toFixed(2)}`} delta="+18.7%" />
            <StatCard title="Total Drivers" value={String(stats.onlineDrivers)} delta="+8.4%" />
            <StatCard title="Total Customers" value={String(stats.totalCustomers)} delta="+15.3%" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700">Bookings Overview</h3>
              <div className="mt-4 flex h-48 items-end gap-3">
                {bookingsByHour.map((value, index) => (
                  <div
                    key={index}
                    className={`flex-1 rounded-t-xl bg-[linear-gradient(180deg,#60a5fa,#2563eb)] ${bookingBarClass(value)}`}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-700">Recent Bookings</h3>
              <div className="mt-3 space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <article key={order.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">{String(order.status).toUpperCase()}</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">{order.finalPrice.toFixed(2)}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      )
    }

    if (activeTab === 'bookings') {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-800">Booking Management</h3>
          <div className="mt-3 space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">{order.pickupAddress?.fullAddress || 'Pickup'} to {order.dropAddress?.fullAddress || 'Drop'}</p>
                </div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{String(order.status).toUpperCase()}</span>
                <button
                  onClick={() => setMessage(`Booking ${order.orderNumber} opened`)}
                  className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </section>
      )
    }

    if (activeTab === 'drivers') {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-800">Driver Management</h3>
          <div className="mt-3 space-y-2">
            {drivers.map((driver) => (
              <article key={driver.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{driver.name}</p>
                  <p className="text-xs text-slate-500">{driver.phone} • {driver.rating.toFixed(1)} rating</p>
                </div>
                <button
                  onClick={() => toggleDriverStatus(driver.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    driver.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {driver.isOnline ? 'Online' : 'Offline'}
                </button>
              </article>
            ))}
          </div>
        </section>
      )
    }

    if (activeTab === 'customers') {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-800">Customer Insights</h3>
          <p className="mt-2 text-sm text-slate-500">Customers are derived from live booking records.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {orders.slice(0, 8).map((order) => (
              <article key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-sm font-semibold text-slate-800">{order.orderNumber}</p>
                <p className="text-xs text-slate-500">Created {new Date(order.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>
      )
    }

    if (activeTab === 'earnings') {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-800">Earnings</h3>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{stats.totalEarnings.toFixed(2)}</p>
          <p className="text-sm text-slate-500">Wallet float: {stats.walletBalance.toFixed(2)}</p>
        </section>
      )
    }

    if (activeTab === 'vehicles') {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-800">Fleet Management</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <FleetCard type="Bike" count={15} />
            <FleetCard type="Auto" count={12} />
            <FleetCard type="Mini Truck" count={8} />
          </div>
        </section>
      )
    }

    if (activeTab === 'offers') {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-800">Offers & Coupons</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto]">
            <input
              value={offerCode}
              onChange={(event) => setOfferCode(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Coupon code"
            />
            <input
              value={offerDiscount}
              onChange={(event) => setOfferDiscount(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Discount %"
            />
            <button
              onClick={saveOffer}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Save Offer
            </button>
          </div>
        </section>
      )
    }

    if (activeTab === 'reports') {
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-800">Reports & Analytics</h3>
          <p className="mt-2 text-sm text-slate-500">Export snapshot reports for bookings and driver operations.</p>
          <button
            onClick={exportReport}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Export JSON Report
          </button>
        </section>
      )
    }

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-800">Settings</h3>
        <label className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          Push notifications
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(event) => {
              const next = event.target.checked
              setNotificationsEnabled(next)
              window.localStorage.setItem('vinayaka_admin_notifications', String(next))
              setMessage('Settings updated')
            }}
          />
        </label>
      </section>
    )
  }

  return (
    <main className="min-h-screen bg-[#F4F7FB] p-4 md:p-6">
      <div className="mx-auto grid w-full max-w-[1280px] gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-3xl bg-[linear-gradient(180deg,#05204b,#0a2e63_48%,#0c3b7d)] p-4 text-white shadow-[0_28px_64px_-32px_rgba(15,23,42,0.8)]">
          <div className="rounded-2xl bg-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Vinayaka</p>
            <p className="mt-1 text-lg font-bold">Transport Ops</p>
          </div>

          <nav className="mt-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeTab === item.id ? 'bg-blue-500 text-white' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <header className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Enterprise control center for live transport operations.</p>
          </header>

          {renderContent()}

          {message ? (
            <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {message}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  )
}

function StatCard({ title, value, delta }: { title: string; value: string; delta: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-semibold text-emerald-600">{delta}</p>
    </article>
  )
}

function FleetCard({ type, count }: { type: string; count: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-sm font-semibold text-slate-800">{type}</p>
      <p className="mt-1 text-xs text-slate-500">Available</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{count}</p>
    </article>
  )
}
