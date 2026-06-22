'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { io } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const API_BASE = API_URL.replace(/\/api$/, '')
const ACCESS_TOKEN_KEY = 'vinayaka_access_token'
const REFRESH_TOKEN_KEY = 'vinayaka_refresh_token'

type RiderProfile = {
  id: string
  dailyEarnings: number
  dailyDeliveries: number
  totalDeliveries: number
  averageRating: number
  latitude?: number | null
  longitude?: number | null
}

type RiderOrder = {
  id: string
  orderNumber: string
  status: string
  finalPrice: number
  pickupAddress?: { fullAddress?: string } | null
  dropAddress?: { fullAddress?: string } | null
}

export default function RiderDashboard() {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(false)
  const [profile, setProfile] = useState<RiderProfile | null>(null)
  const [orders, setOrders] = useState<RiderOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)

    if (!token) {
      router.replace('/login')
      return
    }

    Promise.all([
      fetch(`${API_URL}/riders/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/orders?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([profileResponse, ordersResponse]) => {
        const rider = profileResponse?.data || null
        setProfile(rider)
        setIsOnline(Boolean(rider?.isOnline))
        setOrders(ordersResponse?.data?.items || [])
      })
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.localStorage.removeItem(REFRESH_TOKEN_KEY)
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    if (!profile?.id) return

    const socket = io(API_BASE, { transports: ['websocket', 'polling'] })
    socket.emit('join:rider', profile.id)

    socket.on('order:update', () => {
      const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
      if (!token) return
      fetch(`${API_URL}/orders?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((payload) => setOrders(payload?.data?.items || []))
        .catch(() => null)
    })

    return () => {
      socket.disconnect()
    }
  }, [profile?.id])

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED').length, [orders])

  const toggleOnline = async () => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return

    const endpoint = isOnline ? 'offline' : 'online'
    try {
      await fetch(`${API_URL}/riders/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      setIsOnline(!isOnline)

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          fetch(`${API_URL}/riders/location`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }),
          }).catch(() => null)
        })
      }
    } catch (_) {
      // no-op
    }
  }

  const acceptOrder = async (orderId: string) => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return

    await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'PICKED_UP' }),
    }).catch(() => null)

    const refreshed = await fetch(`${API_URL}/orders?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.json())

    setOrders(refreshed?.data?.items || [])
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading rider dashboard...</div>
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-white">Rider Dashboard</h1>
        <button
          onClick={toggleOnline}
          className={`px-6 py-2 rounded-full font-semibold transition ${
            isOnline ? 'bg-green-500 text-white' : 'bg-slate-700 text-gray-300'
          }`}
        >
          {isOnline ? '🟢 Online' : '⚫ Offline'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { label: 'Today Earnings', value: `₹${profile?.dailyEarnings || 0}`, icon: '💰', color: 'from-green-500' },
            { label: 'Active Orders', value: String(activeOrders), icon: '📦', color: 'from-blue-500' },
            { label: 'Completed', value: String(profile?.dailyDeliveries || 0), icon: '✅', color: 'from-orange-500' },
            { label: 'Rating', value: String(profile?.averageRating || 0), icon: '⭐', color: 'from-yellow-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Map Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Map integration - Coming soon</p>
            <p className="text-sm text-gray-500 mt-2">Real-time location tracking & order map</p>
          </div>
        </div>

        {/* Available Orders */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">🔥 Nearby Orders</h3>

          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center hover:bg-slate-700/70 transition cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <p className="font-semibold text-white">{order.pickupAddress?.fullAddress || 'Pickup'} → {order.dropAddress?.fullAddress || 'Drop'}</p>
                  </div>
                  <p className="text-sm text-gray-400">📦 {order.orderNumber} • ₹{order.finalPrice} • {order.status}</p>
                </div>
                <button onClick={() => acceptOrder(order.id)} className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 transition">
                  Accept
                </button>
              </div>
            ))}
          </div>

          {isOnline && orders.length > 0 ? (
            <div className="mt-6 text-center text-gray-400">
              <p>No more orders nearby. Keep checking!</p>
            </div>
          ) : (
            <div className="mt-6 text-center bg-slate-700/50 p-4 rounded-lg">
              <p className="text-gray-300">Go online to see available orders</p>
            </div>
          )}
        </div>

        {/* Earnings Summary */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">📊 Earnings This Week</h3>
          <div className="grid md:grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-gray-400 mb-2">{day}</p>
                <div className="bg-slate-700 h-16 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400 text-sm">₹0</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
