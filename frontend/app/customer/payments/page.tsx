'use client'

import { useState } from 'react'
import { getDemoWallet } from '@/lib/customer-api'

export default function CustomerPaymentsPage() {
  const [method, setMethod] = useState('UPI')
  const [message, setMessage] = useState('')
  const wallet = getDemoWallet()

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="mt-1 text-sm text-slate-500">Manage preferred payment method and wallet balance.</p>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {['UPI', 'COD', 'WALLET'].map((item) => (
              <button key={item} onClick={() => setMethod(item)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${method === item ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {item}
              </button>
            ))}
          </div>

          <p className="mt-3 text-sm text-slate-600">Selected method: <span className="font-semibold text-slate-900">{method}</span></p>
          <p className="text-sm text-slate-600">Wallet balance: <span className="font-semibold text-emerald-600">{wallet.balance.toFixed(2)}</span></p>

          <button onClick={() => setMessage('Payment preference saved')} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Save Preference</button>
        </section>

        {message ? <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p> : null}
      </div>
    </main>
  )
}
