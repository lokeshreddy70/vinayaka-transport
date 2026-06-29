'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { ACCESS_TOKEN_KEY, fetchCustomerOrders, trackByOrderNumber, type Order, type TrackingResponse } from '@/lib/customer-api'
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
        // Keep session until the user logs out manually.
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
        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.35)] md:p-6">
          <h1 className="text-3xl font-bold text-[#111827]">Live Tracking</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Track by order ID in VT-YYYY-XXXXXX format.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
              <Search className="h-4 w-4 text-[#64748B]" />
              <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="VT-2026-000001" className="w-full border-none bg-transparent text-sm text-[#0F172A] focus:outline-none" />
            </label>
            <button onClick={() => onTrack(orderNumber)} className="rounded-2xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">{loading ? 'Tracking...' : 'Track Shipment'}</button>
          </div>

          {activeOrders.length > 0 ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {activeOrders.slice(0, 4).map((order) => (
                <button key={order.id} onClick={() => { setOrderNumber(order.orderNumber); void onTrack(order.orderNumber) }} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-left text-sm font-semibold text-[#334155]">
                  {order.orderNumber}
                </button>
              ))}
            </div>
          ) : null}

          {result ? (
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#64748B]">Order</p>
                <p className="text-lg font-bold text-[#111827]">{result.orderNumber}</p>
                <p className="mt-1 text-sm text-[#334155]">Status: {result.status}</p>
                <p className="text-sm text-[#334155]">ETA: {result.estimatedDeliveryTime ? new Date(result.estimatedDeliveryTime).toLocaleString() : 'Updating...'}</p>
              </div>

              <ul className="grid gap-3">
                {(result.timeline || []).map((event, index) => (
                  <li key={`${event.id || event.status}-${index}`} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#111827]">{event.status}</p>
                      <p className="text-xs text-[#64748B]">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Pending'}</p>
                    </div>
                    <p className="mt-1 text-sm text-[#334155]">{event.message || event.status}</p>
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


