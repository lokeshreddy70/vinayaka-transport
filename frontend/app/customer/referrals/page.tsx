'use client'

import { useEffect, useState } from 'react'

export default function CustomerReferralsPage() {
  const [code] = useState('VINAYAKA-LOKESH')
  const [message, setMessage] = useState('')
  const [referrals, setReferrals] = useState<Array<{ name: string; reward: number }>>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('vinayaka_referrals') || '[]'
      setReferrals(JSON.parse(raw) as Array<{ name: string; reward: number }>)
    } catch {
      setReferrals([])
    }
  }, [])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setMessage('Referral code copied')
    } catch {
      setMessage('Unable to copy code')
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-bold text-slate-900">Referral Program</h1>
          <p className="mt-1 text-sm text-slate-500">Invite friends and earn wallet credits.</p>
          <div className="mt-3 flex gap-2">
            <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">{code}</div>
            <button onClick={copyCode} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Copy</button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Referral History</h2>
          <div className="mt-3 space-y-2">
            {referrals.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">No referrals yet.</p> : null}
            {referrals.map((item, index) => (
              <article key={index} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm text-slate-700">{item.name}</p>
                <p className="text-sm font-semibold text-emerald-600">+{item.reward.toFixed(2)}</p>
              </article>
            ))}
          </div>
        </section>

        {message ? <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p> : null}
      </div>
    </main>
  )
}
