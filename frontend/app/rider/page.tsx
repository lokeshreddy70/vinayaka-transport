'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  MapPin,
  Phone,
  Route,
  ShieldAlert,
  Star,
  Wallet,
} from 'lucide-react'
import {
  getDemoOrders,
  updateDemoOrderStatus,
  type Order,
} from '@/lib/customer-api'

type RiderTrip = {
  id: string
  orderNumber: string
  pickup: string
  drop: string
  fare: number
  status: string
}

const RIDER_ONLINE_KEY = 'vinayaka_rider_online'
const RIDER_EARNINGS_KEY = 'vinayaka_rider_earnings'
const RIDER_TRIPS_KEY = 'vinayaka_rider_trips'

function getLocalBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') {
    return fallback
  }
  const raw = window.localStorage.getItem(key)
  if (raw === null) {
    return fallback
  }
  return raw === 'true'
}

function getLocalNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') {
    return fallback
  }
  const raw = Number(window.localStorage.getItem(key) || '')
  return Number.isFinite(raw) ? raw : fallback
}

function getLocalTrips(): RiderTrip[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(RIDER_TRIPS_KEY)
    return raw ? (JSON.parse(raw) as RiderTrip[]) : []
  } catch {
    return []
  }
}

function setLocalTrips(trips: RiderTrip[]) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(RIDER_TRIPS_KEY, JSON.stringify(trips))
  } catch {
    // Ignore storage failures.
  }
}

function normalizeDemoOrdersToTrips(orders: Order[]): RiderTrip[] {
  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    pickup: order.pickupAddress?.fullAddress || 'Pickup Point',
    drop: order.dropAddress?.fullAddress || 'Drop Point',
    fare: order.finalPrice || 120,
    status: String(order.status || 'PENDING').toUpperCase(),
  }))
}

export default function RiderDashboard() {
  const [isOnline, setIsOnline] = useState(false)
  const [rating] = useState(4.8)
  const [earnings, setEarnings] = useState(1750)
  const [onlineTime] = useState('05:30 hrs')
  const [trips, setTrips] = useState<RiderTrip[]>([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const online = getLocalBool(RIDER_ONLINE_KEY, true)
    const riderEarnings = getLocalNumber(RIDER_EARNINGS_KEY, 1750)

    const existingTrips = getLocalTrips()
    const sourceTrips = existingTrips.length > 0 ? existingTrips : normalizeDemoOrdersToTrips(getDemoOrders())

    setIsOnline(online)
    setEarnings(riderEarnings)
    setTrips(sourceTrips)
    if (sourceTrips[0]) {
      setSelectedTripId(sourceTrips[0].id)
    }
  }, [])

  const activeTrips = useMemo(
    () => trips.filter((trip) => !['DELIVERED', 'CANCELLED'].includes(trip.status)),
    [trips]
  )

  const currentTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) || activeTrips[0] || null,
    [trips, selectedTripId, activeTrips]
  )

  function updateTripStatus(tripId: string, status: string) {
    const updatedTrips = trips.map((trip) =>
      trip.id === tripId
        ? {
            ...trip,
            status,
          }
        : trip
    )

    setTrips(updatedTrips)
    setLocalTrips(updatedTrips)
    updateDemoOrderStatus(tripId, status)

    if (status === 'DELIVERED') {
      const earned = currentTrip?.fare || 120
      const nextEarnings = earnings + earned
      setEarnings(nextEarnings)
      window.localStorage.setItem(RIDER_EARNINGS_KEY, String(nextEarnings))
      setMessage(`Trip completed. Added ${earned.toFixed(2)} to earnings.`)
      return
    }

    setMessage(`Trip updated to ${status}`)
  }

  function toggleOnline() {
    const next = !isOnline
    setIsOnline(next)
    window.localStorage.setItem(RIDER_ONLINE_KEY, String(next))
    setMessage(next ? 'You are online and receiving requests.' : 'You are offline now.')
  }

  function withdrawWallet() {
    const value = Math.min(earnings, 500)
    const next = Math.max(0, earnings - value)
    setEarnings(next)
    window.localStorage.setItem(RIDER_EARNINGS_KEY, String(next))
    setMessage(`Withdrawal requested for ${value.toFixed(2)}`)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#03152f,#08264f_55%,#0b2f66)] px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-md space-y-4">
        <section className="rounded-[28px] border border-white/15 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Driver App</p>
              <h1 className="mt-1 text-xl font-bold">Today's Earnings</h1>
            </div>
            <button
              onClick={toggleOnline}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                isOnline ? 'bg-emerald-400 text-emerald-950' : 'bg-white/10 text-white'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <article className="rounded-2xl bg-black/20 p-3">
              <p className="text-xs text-blue-100">Earnings</p>
              <p className="mt-1 text-2xl font-bold">{earnings.toFixed(2)}</p>
            </article>
            <article className="rounded-2xl bg-black/20 p-3">
              <p className="text-xs text-blue-100">Rating</p>
              <p className="mt-1 inline-flex items-center gap-1 text-2xl font-bold">
                {rating.toFixed(1)}
                <Star className="h-5 w-5 fill-yellow-300 text-yellow-300" />
              </p>
            </article>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/10 px-2 py-2">
              <p className="font-semibold">{trips.length}</p>
              <p className="text-blue-100">Trips</p>
            </div>
            <div className="rounded-xl bg-white/10 px-2 py-2">
              <p className="font-semibold">{activeTrips.length}</p>
              <p className="text-blue-100">Active</p>
            </div>
            <div className="rounded-xl bg-white/10 px-2 py-2">
              <p className="font-semibold">{onlineTime}</p>
              <p className="text-blue-100">Online Time</p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-100">Trip Requests</h2>
            <Bell className="h-4 w-4 text-blue-200" />
          </div>

          <div className="mt-3 space-y-2">
            {activeTrips.length === 0 ? (
              <p className="rounded-xl bg-black/20 px-3 py-3 text-xs text-blue-100">
                No active requests right now.
              </p>
            ) : (
              activeTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => setSelectedTripId(trip.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    selectedTripId === trip.id
                      ? 'border-blue-300 bg-blue-500/20'
                      : 'border-white/10 bg-black/20 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm font-semibold">{trip.orderNumber}</p>
                  <p className="mt-1 text-xs text-blue-100">{trip.pickup}</p>
                  <p className="text-xs text-blue-200">to {trip.drop}</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-300">{trip.fare.toFixed(2)} • {trip.status}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="relative h-44 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_70%_15%,#1d4ed8_10%,transparent_45%),radial-gradient(circle_at_25%_70%,#0ea5e9_15%,transparent_48%),#0b1f3f] p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-200">Route Map</p>
            <div className="absolute left-6 top-20 h-3 w-3 rounded-full bg-emerald-300" />
            <div className="absolute right-8 top-12 h-3 w-3 rounded-full bg-orange-300" />
            <div className="absolute left-1/3 top-1/2 h-24 w-24 rounded-full border border-white/20" />
            <div className="absolute bottom-3 right-3 rounded-xl bg-black/35 px-2 py-1 text-[11px] text-blue-100">
              Live navigation active
            </div>
          </div>

          {currentTrip ? (
            <div className="mt-3 rounded-2xl bg-black/20 p-3">
              <p className="text-sm font-semibold">{currentTrip.orderNumber}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-blue-100">
                <MapPin className="h-3.5 w-3.5" />
                {currentTrip.pickup}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-blue-100">
                <Route className="h-3.5 w-3.5" />
                {currentTrip.drop}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  onClick={() => updateTripStatus(currentTrip.id, 'ASSIGNED')}
                  className="rounded-xl bg-emerald-400 px-3 py-2 text-emerald-950"
                >
                  Accept
                </button>
                <button
                  onClick={() => updateTripStatus(currentTrip.id, 'CANCELLED')}
                  className="rounded-xl bg-rose-400 px-3 py-2 text-rose-950"
                >
                  Reject
                </button>
                <button
                  onClick={() => updateTripStatus(currentTrip.id, 'PICKED_UP')}
                  className="rounded-xl bg-blue-400 px-3 py-2 text-blue-950"
                >
                  Start Trip
                </button>
                <button
                  onClick={() => updateTripStatus(currentTrip.id, 'DELIVERED')}
                  className="rounded-xl bg-indigo-300 px-3 py-2 text-indigo-950"
                >
                  Complete
                </button>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-semibold">
                <a
                  href="tel:+919876543210"
                  className="rounded-xl bg-white/15 px-2 py-2 text-center text-white"
                >
                  <Phone className="mx-auto h-3.5 w-3.5" />
                  Call
                </a>
                <button
                  onClick={() => setMessage('Chat opened with customer')}
                  className="rounded-xl bg-white/15 px-2 py-2"
                >
                  Chat
                </button>
                <button
                  onClick={() => setMessage('Trip shared with customer contact')}
                  className="rounded-xl bg-white/15 px-2 py-2"
                >
                  Share
                </button>
                <a
                  href="tel:112"
                  className="rounded-xl bg-red-400/80 px-2 py-2 text-center text-red-950"
                >
                  <ShieldAlert className="mx-auto h-3.5 w-3.5" />
                  SOS
                </a>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-100">Wallet & Earnings</h2>
            <Wallet className="h-4 w-4 text-blue-200" />
          </div>
          <p className="mt-2 text-2xl font-bold">{earnings.toFixed(2)}</p>
          <button
            onClick={withdrawWallet}
            className="mt-3 w-full rounded-xl bg-yellow-300 px-4 py-2 text-sm font-semibold text-yellow-950"
          >
            Withdraw Balance
          </button>
        </section>

        {message ? (
          <p className="rounded-2xl border border-blue-300/35 bg-blue-500/15 px-4 py-3 text-sm text-blue-100">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  )
}
