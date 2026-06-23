'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { FileDown, LifeBuoy, MapPinned } from 'lucide-react'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, API_URL, fetchOrderDetails, trackByOrderNumber, type Order, type TrackingResponse } from '@/lib/customer-api'

type TimelineEntry = {
  status: string
  timestamp: string
  message: string
}

export default function CustomerOrderDetailsPage() {
  const params = useParams<{ orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [tracking, setTracking] = useState<TrackingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      router.replace('/customer/login')
      return
    }

    const id = params?.orderId
    if (!id) {
      setError('Order id is required')
      setLoading(false)
      return
    }

    fetchOrderDetails(token, id)
      .then(async (data) => {
        setOrder(data)
        if (data?.orderNumber) {
          const trace = await trackByOrderNumber(data.orderNumber)
          setTracking(trace)
        }
      })
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.localStorage.removeItem(REFRESH_TOKEN_KEY)
        router.replace('/customer/login')
      })
      .finally(() => setLoading(false))
  }, [params, router])

  const timeline = useMemo<TimelineEntry[]>(() => {
    if (tracking?.timeline?.length) {
      return tracking.timeline.map((event) => ({
        status: event.status || 'UPDATE',
        timestamp: event.timestamp || new Date().toISOString(),
        message: event.message || 'Status updated',
      }))
    }

    return (
      order?.trackingLogs?.map((event) => ({
        status: event.status,
        timestamp: event.timestamp || event.createdAt || new Date().toISOString(),
        message: event.status,
      })) || []
    )
  }, [order, tracking])

  async function downloadInvoice() {
    if (!order?.id) {
      return
    }

    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      router.replace('/customer/login')
      return
    }

    try {
      const response = await fetch(`${API_URL}/orders/${order.id}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      const data = payload?.data || payload
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${order.orderNumber}-invoice.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Unable to download invoice right now')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#F8FAFC] px-6 py-10 text-[#0A2540]">Loading order details...</div>
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-6 py-10 text-[#0A2540]">
        <p>{error || 'Order not found'}</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-35px_rgba(10,37,64,0.35)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Order details</p>
              <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">{order.orderNumber}</h1>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{order.status}</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-[#0A2540]">Distance & Fare</p>
              <p className="mt-2">Fare: {order.finalPrice.toFixed(2)}</p>
              <p>Payment: Pending/As per mode</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-[#0A2540]">Driver & Vehicle</p>
              <p className="mt-2">Driver: {order.rider?.user?.fullName || 'Will be assigned shortly'}</p>
              <p>Vehicle: {order.rider?.vehicle?.vehicleNumber || 'Pending assignment'}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:flex">
            <Link href={`/customer/tracking?order=${encodeURIComponent(order.orderNumber)}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A2540] px-4 py-3 text-sm font-semibold text-white">
              <MapPinned className="h-4 w-4" />
              Live Tracking
            </Link>
            <button onClick={downloadInvoice} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
              <FileDown className="h-4 w-4" />
              Invoice Download
            </button>
            <a href="tel:+919876543210" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
              <LifeBuoy className="h-4 w-4" />
              Support
            </a>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-bold text-[#0A2540]">Timeline</h2>
            <ul className="mt-3 grid gap-3">
              {timeline.map((event, index) => (
                <li key={`${event.status}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0A2540]">{event.status}</p>
                    <p className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{event.message}</p>
                </li>
              ))}
              {timeline.length === 0 ? <li className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">No timeline events yet.</li> : null}
            </ul>
          </div>

          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        </section>
      </div>
    </main>
  )
}


