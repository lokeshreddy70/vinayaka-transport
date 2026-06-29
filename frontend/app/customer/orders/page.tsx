'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { ACCESS_TOKEN_KEY, fetchCustomerOrders, type Order } from '@/lib/customer-api'
import { CustomerBottomNav } from '@/components/customer/BottomNav'

const statusFilters = ['ALL', 'PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)

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
      .finally(() => setLoading(false))
  }, [router])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return orders.filter((order) => {
      const statusMatch = status === 'ALL' || order.status.toUpperCase() === status
      const searchMatch = !term || order.orderNumber.toLowerCase().includes(term) || new Date(order.createdAt).toLocaleDateString().toLowerCase().includes(term)
      return statusMatch && searchMatch
    })
  }, [orders, search, status])

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-35px_rgba(10,37,64,0.35)] md:p-6">
          <h1 className="text-3xl font-bold text-[#0A2540]">Order History</h1>
          <p className="mt-1 text-sm text-slate-600">Search by Order ID, date, and status.</p>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border-none bg-transparent text-sm focus:outline-none" placeholder="Search order id or date" />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm" aria-label="Order status filter">
              {statusFilters.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid gap-3">
            {loading ? <p className="text-sm text-slate-500">Loading orders...</p> : null}
            {!loading && filtered.map((order) => (
              <Link key={order.id} href={`/customer/orders/${order.id}`} className="grid grid-cols-[1fr_auto] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 hover:border-slate-300">
                <div>
                  <p className="text-sm font-bold text-[#0A2540]">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#16A34A]">{order.finalPrice.toFixed(2)}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{order.status}</p>
                </div>
              </Link>
            ))}
            {!loading && filtered.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">No orders found for this filter.</p> : null}
          </div>
        </section>
      </div>
      <CustomerBottomNav />
    </main>
  )
}


