'use client'

import { useMemo, useState } from 'react'
import { io } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const API_BASE = API_URL.replace(/\/api$/, '')

type PublicTracking = {
  orderNumber: string
  status: string
  estimatedDeliveryTime?: string | null
  rider?: {
    name: string
    phoneNumber: string
    latitude?: number | null
    longitude?: number | null
  } | null
  timeline: Array<{
    id: string
    status: string
    timestamp: string
    latitude: number
    longitude: number
  }>
}

export default function PublicTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [tracking, setTracking] = useState<PublicTracking | null>(null)

  const timeline = useMemo(() => tracking?.timeline || [], [tracking])

  const connectRealtime = (orderId: string) => {
    const socket = io(API_BASE, { transports: ['websocket', 'polling'] })
    socket.emit('join:order', orderId)
    socket.on('order:update', async () => {
      const response = await fetch(`${API_URL}/orders/public/${orderId}/track`)
      const payload = await response.json()
      if (response.ok) {
        setTracking(payload.data)
      }
    })
  }

  const search = async () => {
    if (!orderNumber.trim()) {
      setMessage('Enter order number')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/orders/public/${orderNumber.trim()}/track`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.message || 'Order not found')
      }

      setTracking(payload.data)
      connectRealtime(orderNumber.trim())
    } catch (error) {
      setTracking(null)
      setMessage(error instanceof Error ? error.message : 'Tracking failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Public Tracking Portal</h1>
        <p className="text-slate-400 mb-8">Track any parcel using its order number.</p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-orange-500"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder="Enter order number"
            />
            <button
              onClick={search}
              disabled={loading}
              className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </div>

          {message ? <p className="mt-4 text-sm text-orange-300">{message}</p> : null}
        </div>

        {tracking ? (
          <div className="mt-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-slate-400 text-sm">Order Number</p>
              <p className="text-xl font-bold">{tracking.orderNumber}</p>
              <p className="text-slate-400 mt-2">Current Status: <span className="text-white font-semibold">{tracking.status}</span></p>
              {tracking.rider ? (
                <p className="text-slate-300 mt-2">Rider: {tracking.rider.name} ({tracking.rider.phoneNumber})</p>
              ) : null}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Timeline</h2>
              <div className="space-y-3">
                {timeline.length === 0 ? (
                  <p className="text-slate-400">No tracking updates yet.</p>
                ) : (
                  timeline.map((item) => (
                    <div key={item.id} className="rounded-lg bg-slate-800 p-4 flex justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{item.status}</p>
                        <p className="text-sm text-slate-400">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-slate-400">{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
