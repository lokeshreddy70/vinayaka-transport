'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, MapPin, User, LogOut, Menu, X, Home, History, Wallet } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const ACCESS_TOKEN_KEY = 'vinayaka_access_token'
const REFRESH_TOKEN_KEY = 'vinayaka_refresh_token'

type CustomerProfile = {
  user: {
    fullName: string
  }
  loyaltyPoints: number
  totalSpent: number
  wallet?: {
    balance: number
  } | null
}

type Order = {
  id: string
  orderNumber: string
  status: string
  finalPrice: number
  createdAt: string
}

export default function CustomerDashboard() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)

    if (!token) {
      router.replace('/login')
      return
    }

    Promise.all([
      fetch(`${API_URL}/customers/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/customers/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([profileResponse, ordersResponse]) => {
        setProfile(profileResponse?.data || null)
        setOrders(ordersResponse?.data || [])
      })
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.localStorage.removeItem(REFRESH_TOKEN_KEY)
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED').length, [orders])

  const handleLogout = () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    router.replace('/login')
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading customer dashboard...</div>
  }

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && <h2 className="font-bold text-orange-500">Vinayaka</h2>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { icon: Home, label: 'Home', href: '/customer' },
            { icon: Package, label: 'Send Parcel', href: '/customer/book' },
            { icon: History, label: 'Orders', href: '/customer/orders' },
            { icon: Wallet, label: 'Wallet', href: '/customer/wallet' },
            { icon: MapPin, label: 'Addresses', href: '/customer/addresses' },
            { icon: User, label: 'Profile', href: '/customer/profile' },
          ].map((item, i) => (
            <Link key={i} href={item.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 transition text-gray-300 hover:text-white">
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-700 transition text-gray-300 hover:text-white">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Welcome back{profile?.user?.fullName ? `, ${profile.user.fullName}` : ''}!</h1>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
              {profile?.user?.fullName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'Active Orders', value: String(activeOrders), icon: '📦', color: 'from-blue-500' },
              { label: 'Total Spent', value: `₹${profile?.totalSpent || 0}`, icon: '💳', color: 'from-green-500' },
              { label: 'Wallet Balance', value: `₹${profile?.wallet?.balance || 0}`, icon: '👛', color: 'from-orange-500' },
              { label: 'Loyalty Points', value: String(profile?.loyaltyPoints || 0), icon: '⭐', color: 'from-purple-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className="text-3xl">{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Send Parcel CTA */}
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to send a parcel?</h2>
            <Link href="/customer/book" className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition inline-block">
              Send Parcel Now
            </Link>
          </div>

          {/* Recent Orders */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Recent Orders</h3>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No orders yet. <Link href="/customer/book" className="text-orange-500 hover:underline">Send your first parcel!</Link></p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="rounded-lg bg-slate-700/50 p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">{order.orderNumber}</p>
                      <p className="text-gray-400 text-sm">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-semibold">₹{order.finalPrice}</p>
                      <p className="text-gray-300 text-sm">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
