'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageCircle, Search, Share2, ShieldAlert } from 'lucide-react'
import {
  ACCESS_TOKEN_KEY,
  fetchCustomerOrders,
  trackByOrderNumber,
  type Order,
  type TrackingResponse,
} from '@/lib/customer-api'

export default function CustomerTrackingPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [orderNumber, setOrderNumber] = useState('')
  const [result, setResult] = useState<TrackingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      router.replace('/customer/login')
      return
    }

    fetchCustomerOrders(token).then(setOrders).catch(() => null)

    const query = new URLSearchParams(window.location.search)
    const initialOrder = query.get('order') || ''
    if (initialOrder) {
      setOrderNumber(initialOrder)
      void onTrack(initialOrder)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const quickOrders = useMemo(
    () => orders.filter((item) => !['DELIVERED', 'CANCELLED'].includes(String(item.status).toUpperCase())).slice(0, 4),
    [orders]
  )

  async function onTrack(value: string) {
    if (!value.trim()) {
      setError('Enter order number')
      return
    }

    try {
      setLoading(true)
      setError('')
      const tracked = await trackByOrderNumber(value.trim())
      setResult(tracked)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to track this order')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  async function onShare() {
    if (!result?.orderNumber) {
      setMessage('Track an order first')
      return
    }

    const text = `Track trip ${result.orderNumber} on Vinayaka Transport`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Live Tracking', text, url: window.location.href })
        setMessage('Trip shared')
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`)
        setMessage('Tracking link copied')
      }
    } catch {
      setMessage('Unable to share right now')
    }
  }

  const riderPhone = result?.rider?.phoneNumber || '+919876543210'

  return (
    <main className="min-h-screen bg-[#eef3fb] px-4 py-5">
      <div className="mx-auto w-full max-w-md">
        <section className="rounded-[28px] border border-[#e2e8f0] bg-white px-4 py-4 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.4)]">
          <div className="flex items-center justify-between">
            <button title="Back to home" onClick={() => router.push('/customer')} className="rounded-full border border-[#e2e8f0] p-2 text-[#334155]">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-base font-bold text-[#0f172a]">Live Tracking</h1>
            <button title="Share trip" onClick={onShare} className="rounded-full border border-[#e2e8f0] p-2 text-[#334155]">
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
              <Search className="h-4 w-4 text-[#64748b]" />
              <input
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="VT-2026-000001"
                className="w-full border-none bg-transparent text-sm text-[#0f172a] outline-none"
              />
            </label>
            <button onClick={() => onTrack(orderNumber)} className="rounded-2xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white">
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-3xl border border-[#dbe5f4] bg-[linear-gradient(170deg,#f8fbff,#eef4ff)] p-3">
            <div className="relative h-56 rounded-2xl border border-white/75 bg-[#eef2f7]">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 220" fill="none">
                <path d="M40 180 C70 150, 90 130, 120 120 C150 110, 170 80, 210 70 C240 62, 260 38, 288 26" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <div className="absolute left-9 top-36 h-3 w-3 rounded-full bg-[#0ea5e9]" />
              <div className="absolute right-8 top-8 h-3 w-3 rounded-full bg-[#16a34a]" />
            </div>
          </div>

          {quickOrders.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {quickOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setOrderNumber(order.orderNumber)
                    void onTrack(order.orderNumber)
                  }}
                  className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-left"
                >
                  <p className="text-xs font-semibold text-[#0f172a]">{order.orderNumber}</p>
                  <p className="text-[10px] text-[#64748b]">{String(order.status).toUpperCase()}</p>
                </button>
              ))}
            </div>
          ) : null}

          {result ? (
            <article className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white px-3 py-3 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.4)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#0f172a]">{result.rider?.name || 'Ramesh Kumar'}</p>
                  <p className="text-[11px] text-[#64748b]">Order {result.orderNumber}</p>
                </div>
                <p className="text-sm font-bold text-[#2563eb]">{result.status}</p>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
                <button onClick={onShare} className="rounded-xl border border-[#e2e8f0] bg-white px-2 py-2 font-semibold text-[#334155]">Share</button>
                <a title="Call driver" href={`tel:${riderPhone}`} className="rounded-xl border border-[#e2e8f0] bg-white px-2 py-2 text-center font-semibold text-[#334155]">Call</a>
                <a title="Chat with driver" href={`https://wa.me/${riderPhone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-[#e2e8f0] bg-white px-2 py-2 font-semibold text-[#334155]"><MessageCircle className="h-3.5 w-3.5" /></a>
                <a title="Emergency call" href="tel:112" className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-red-700"><ShieldAlert className="h-3.5 w-3.5" /></a>
              </div>
            </article>
          ) : null}

          {error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
          {message ? <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">{message}</p> : null}
        </section>
      </div>
    </main>
  )
}
