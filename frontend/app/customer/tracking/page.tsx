'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, fetchCustomerOrders, trackByOrderNumber, type Order, type TrackingResponse } from '@/lib/customer-api'
import { CustomerBottomNav } from '@/components/customer/BottomNav'

export default function CustomerTrackingPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [orderNumber, setOrderNumber] = useState('')
  const [result, setResult] = useState<TrackingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      router.replace('/customer/login')
      return
    }

    fetchCustomerOrders(token)
      .then(setOrders)
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.localStorage.removeItem(REFRESH_TOKEN_KEY)
        router.replace('/customer/login')
      })
  }, [router])

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const fromUrl = query.get('order') || ''
    if (!fromUrl) {
      return
    }
    setOrderNumber(fromUrl)
    void onTrack(fromUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeOrders = useMemo(() => orders.filter((item) => !['DELIVERED', 'CANCELLED', 'delivered', 'cancelled'].includes(item.status)), [orders])

  async function onTrack(value: string) {
    try {
      setLoading(true)
      setError('')
      const tracked = await trackByOrderNumber(value)
      setResult(tracked)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Unable to track this order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-35px_rgba(10,37,64,0.35)] md:p-6">
          <h1 className="text-3xl font-bold text-[#0A2540]">Live Tracking</h1>
          <p className="mt-1 text-sm text-slate-600">Track by order ID in VT-YYYY-XXXXXX format.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="VT-2026-000001" className="w-full border-none bg-transparent text-sm focus:outline-none" />
            </label>
            <button onClick={() => onTrack(orderNumber)} className="rounded-2xl bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white">{loading ? 'Tracking...' : 'Track Shipment'}</button>
          </div>

          {activeOrders.length > 0 ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {activeOrders.slice(0, 4).map((order) => (
                <button key={order.id} onClick={() => { setOrderNumber(order.orderNumber); void onTrack(order.orderNumber) }} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700">
                  {order.orderNumber}
                </button>
              ))}
            </div>
          ) : null}

          {result ? (
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Order</p>
                <p className="text-lg font-bold text-[#0A2540]">{result.orderNumber}</p>
                <p className="mt-1 text-sm text-slate-700">Status: {result.status}</p>
                <p className="text-sm text-slate-700">ETA: {result.estimatedDeliveryTime ? new Date(result.estimatedDeliveryTime).toLocaleString() : 'Updating...'}</p>
              </div>

              <ul className="grid gap-3">
                {(result.timeline || []).map((event, index) => (
                  <li key={`${event.id || event.status}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0A2540]">{event.status}</p>
                      <p className="text-xs text-slate-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Pending'}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{event.message || event.status}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        </section>
      </div>
      <CustomerBottomNav />
    </main>
  )
}


