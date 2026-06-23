'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACCESS_TOKEN_KEY, API_URL, REFRESH_TOKEN_KEY } from '@/lib/customer-api'

type LoginMode = 'otp' | 'password' | 'signup'

export default function CustomerLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('password')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const existing = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (existing) {
      router.replace('/customer')
    }
  }, [router])

  const canUsePassword = useMemo(() => phone.trim().length >= 10 && password.trim().length >= 8, [phone, password])
  const canSignup = useMemo(() => fullName.trim().length >= 2 && phone.trim().length >= 10 && password.trim().length >= 8, [fullName, phone, password])

  const saveSession = (payload: any) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token)
    window.localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh_token)
    router.replace('/customer')
  }

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_URL}/auth/customer-request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to send OTP')
      }
      setOtpSent(true)
      setMessage('OTP sent to your mobile number')
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to send OTP'
      if (text.toLowerCase().includes('unsupported phone provider')) {
        setMode('password')
        setMessage('SMS OTP is not enabled yet. Use password login for now.')
      } else {
        setMessage(text)
      }
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_URL}/auth/customer-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, token: otp }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Invalid OTP')
      }
      saveSession(payload)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  const loginWithPassword = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_URL}/auth/customer-password-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to login')
      }
      saveSession(payload)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to login')
    } finally {
      setLoading(false)
    }
  }

  const signup = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_URL}/auth/customer-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, password }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create account')
      }
      setMode('password')
      setMessage('Account created. Login with your mobile number and password.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-50px_rgba(10,37,64,0.7)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#0A2540]">Vinayaka Customer App</p>
        <h1 className="mt-3 text-3xl font-bold text-[#0A2540]">Customer Login</h1>
        <p className="mt-2 text-sm text-slate-600">Use your own mobile login. Session stays active until you logout manually.</p>

        <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
          <button onClick={() => setMode('otp')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'otp' ? 'bg-white text-[#0A2540]' : 'text-slate-600'}`}>OTP</button>
          <button onClick={() => setMode('password')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'password' ? 'bg-white text-[#0A2540]' : 'text-slate-600'}`}>Password</button>
          <button onClick={() => setMode('signup')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-white text-[#0A2540]' : 'text-slate-600'}`}>Sign Up</button>
        </div>

        {mode === 'otp' ? (
          <>
            <form onSubmit={sendOtp} className="mt-6 grid gap-3">
              <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number" className="rounded-2xl border border-slate-300 px-4 py-3" />
              <button disabled={loading} className="rounded-2xl bg-[#FF6B00] px-4 py-3 font-semibold text-white">{loading ? 'Sending OTP...' : 'Send OTP'}</button>
            </form>
            {otpSent ? (
              <form onSubmit={verifyOtp} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input required value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter OTP" className="rounded-2xl border border-slate-300 px-4 py-3" />
                <button disabled={loading} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-[#0A2540]">{loading ? 'Verifying...' : 'Verify OTP & Login'}</button>
              </form>
            ) : null}
          </>
        ) : null}

        {mode === 'password' ? (
          <form onSubmit={loginWithPassword} className="mt-6 grid gap-3">
            <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number" className="rounded-2xl border border-slate-300 px-4 py-3" />
            <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="rounded-2xl border border-slate-300 px-4 py-3" />
            <button disabled={!canUsePassword || loading} className="rounded-2xl bg-[#0A2540] px-4 py-3 font-semibold text-white">{loading ? 'Logging in...' : 'Login'}</button>
          </form>
        ) : null}

        {mode === 'signup' ? (
          <form onSubmit={signup} className="mt-6 grid gap-3">
            <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" className="rounded-2xl border border-slate-300 px-4 py-3" />
            <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number" className="rounded-2xl border border-slate-300 px-4 py-3" />
            <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create password" className="rounded-2xl border border-slate-300 px-4 py-3" />
            <button disabled={!canSignup || loading} className="rounded-2xl bg-[#16A34A] px-4 py-3 font-semibold text-white">{loading ? 'Creating account...' : 'Create Account'}</button>
          </form>
        ) : null}

        {message ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
      </div>
    </main>
  )
}
