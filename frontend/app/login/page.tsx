'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const ACCESS_TOKEN_KEY = 'vinayaka_access_token'
const REFRESH_TOKEN_KEY = 'vinayaka_refresh_token'
const DEVICE_ID_KEY = 'vinayaka_device_id'

export default function LoginPage() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState('+919999999999')
  const [password, setPassword] = useState('Admin@123')
  const [role, setRole] = useState('ADMIN')
  const [deviceId, setDeviceId] = useState(() => {
    if (typeof window === 'undefined') {
      return 'web-ops-device'
    }

    const saved = window.localStorage.getItem(DEVICE_ID_KEY)
    if (saved) {
      return saved
    }

    const generated = `web-${crypto.randomUUID()}`
    window.localStorage.setItem(DEVICE_ID_KEY, generated)
    return generated
  })
  const [deviceInfo, setDeviceInfo] = useState('Operations Web Portal')
  const [authenticating, setAuthenticating] = useState(false)
  const [message, setMessage] = useState('')

  const canSubmit = useMemo(() => phoneNumber.length > 5 && password.length >= 8, [phoneNumber, password])

  const login = async () => {
    setAuthenticating(true)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/auth/login-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, password, role, deviceId, deviceInfo }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.message || 'Login failed')
      }

      window.localStorage.setItem(ACCESS_TOKEN_KEY, payload.data.accessToken)
      window.localStorage.setItem(REFRESH_TOKEN_KEY, payload.data.refreshToken)
      window.localStorage.setItem(DEVICE_ID_KEY, deviceId)

      const userRole = payload?.data?.user?.role
      if (userRole === 'RIDER') {
        router.replace('/rider')
      } else if (userRole === 'CUSTOMER') {
        router.replace('/customer')
      } else {
        router.replace('/admin')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setAuthenticating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-orange-500/10">
        <div className="mb-8">
          <p className="text-orange-400 text-sm uppercase tracking-[0.3em]">Vinayaka Transport</p>
          <h1 className="mt-3 text-3xl font-bold">Operations Portal Login</h1>
          <p className="mt-2 text-slate-400">Password login with role-based portal access.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Phone number</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-orange-500"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+919999999999"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-orange-500"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Role</label>
            <select
              aria-label="User role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-orange-500"
            >
              <option value="ADMIN">Operations / Admin</option>
              <option value="RIDER">Rider</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Device ID</label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-orange-500"
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                placeholder="web-ops-device"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Device info</label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-orange-500"
                value={deviceInfo}
                onChange={(event) => setDeviceInfo(event.target.value)}
                placeholder="Operations Web Portal"
              />
            </div>
          </div>

          <button
            onClick={login}
            disabled={!canSubmit || authenticating}
            className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            {authenticating ? 'Logging in...' : 'Login'}
          </button>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/70 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Seeded admin account</p>
            <p className="mt-1">Phone: +919999999999</p>
            <p>Password: Admin@123</p>
          </div>

          {message ? <p className="text-sm text-orange-300">{message}</p> : null}
        </div>
      </div>
    </div>
  )
}
