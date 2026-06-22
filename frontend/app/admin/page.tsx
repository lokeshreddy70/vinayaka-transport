'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const ACCESS_TOKEN_KEY = 'vinayaka_access_token'
const REFRESH_TOKEN_KEY = 'vinayaka_refresh_token'

type CurrentUser = {
  id: string
  phoneNumber: string
  fullName: string
  role: string
  isVerified: boolean
  isBlocked: boolean
  lastLogin?: string | null
  admin?: { permissions: string[] } | null
}

type Rider = {
  id: string
  isOnline: boolean
  latitude?: number | null
  longitude?: number | null
  user: { fullName: string; phoneNumber: string }
}

type Customer = {
  id: string
  user: { fullName: string; phoneNumber: string }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [riders, setRiders] = useState<Rider[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)

    if (!token) {
      router.replace('/login')
      return
    }

    fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Session expired')
        }
        return response.json()
      })
      .then((response) => {
        setUser(response.data)

        fetch(`${API_URL}/riders`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((payload) => setRiders(payload?.data?.items || []))
          .catch(() => null)
      })
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.localStorage.removeItem(REFRESH_TOKEN_KEY)
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null)
    }

    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    router.replace('/login')
  }

  const searchCustomers = async () => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return

    const response = await fetch(`${API_URL}/customers/search?q=${encodeURIComponent(customerQuery)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await response.json()
    setCustomers(payload?.data?.items || [])
  }

  const openCustomer = async (customerId: string) => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return

    const response = await fetch(`${API_URL}/customers/${customerId}/details`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await response.json()
    setSelectedCustomer(payload?.data || null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading session...
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <div className="w-72 bg-slate-800 border-r border-slate-700 overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-orange-500">Vinayaka Operations</h2>
          <p className="text-sm text-slate-400 mt-2">Authenticated as {user.role}</p>
        </div>

        <div className="p-4 space-y-3 text-sm text-slate-300">
          <div className="rounded-lg bg-slate-700/50 p-4">
            <p className="text-slate-400">Name</p>
            <p className="font-semibold text-white">{user.fullName}</p>
          </div>
          <div className="rounded-lg bg-slate-700/50 p-4">
            <p className="text-slate-400">Phone</p>
            <p className="font-semibold text-white">{user.phoneNumber}</p>
          </div>
          <div className="rounded-lg bg-slate-700/50 p-4">
            <p className="text-slate-400">Last Login</p>
            <p className="font-semibold text-white">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'First session'}</p>
          </div>
          <div className="rounded-lg bg-slate-700/50 p-4">
            <p className="text-slate-400">Permissions</p>
            <p className="font-semibold text-white">
              {user.admin?.permissions?.length ? user.admin.permissions.join(', ') : 'None'}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition text-gray-300 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-slate-800 border-b border-slate-700 px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Operations Dashboard</h1>
            <p className="text-slate-400 mt-1">Real authenticated landing page</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Metric label="User ID" value={user.id} />
            <Metric label="Role" value={user.role} />
            <Metric label="Session" value={user.isBlocked ? 'Blocked' : 'Active'} highlight={!user.isBlocked} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Authenticated Session</h3>
            <p className="text-slate-300">
              This page is loaded from the backend using the JWT stored after password login.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Rider Management</h3>
              <div className="space-y-3 max-h-[380px] overflow-auto">
                {riders.map((rider) => (
                  <div key={rider.id} className="rounded-lg bg-slate-700/50 p-4">
                    <p className="font-semibold text-white">{rider.user.fullName}</p>
                    <p className="text-sm text-slate-300">{rider.user.phoneNumber}</p>
                    <p className="text-sm text-slate-300">Status: {rider.isOnline ? 'Online' : 'Offline'}</p>
                    <p className="text-xs text-slate-400">
                      Location: {rider.latitude ?? '-'}, {rider.longitude ?? '-'}
                    </p>
                  </div>
                ))}
                {riders.length === 0 ? <p className="text-sm text-slate-400">No riders found.</p> : null}
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Customer Search</h3>
              <div className="flex gap-2 mb-3">
                <input
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Name / mobile / ID"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <button onClick={searchCustomers} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
                  Search
                </button>
              </div>
              <div className="space-y-2 max-h-[180px] overflow-auto">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => openCustomer(customer.id)}
                    className="w-full text-left rounded-lg bg-slate-700/50 p-3 hover:bg-slate-700"
                  >
                    <p className="text-white font-semibold">{customer.user.fullName}</p>
                    <p className="text-xs text-slate-300">{customer.user.phoneNumber}</p>
                  </button>
                ))}
              </div>
              {selectedCustomer ? (
                <div className="mt-4 rounded-lg bg-slate-700/40 p-4">
                  <p className="text-white font-semibold">{selectedCustomer.user.fullName}</p>
                  <p className="text-sm text-slate-300">{selectedCustomer.user.phoneNumber}</p>
                  <p className="text-sm text-slate-300">Orders: {selectedCustomer.orders?.length || 0}</p>
                  <p className="text-sm text-slate-300">Wallet: ₹{selectedCustomer.wallet?.balance || 0}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, highlight = true }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-white' : 'text-red-400'}`}>{value}</p>
    </div>
  )
}
