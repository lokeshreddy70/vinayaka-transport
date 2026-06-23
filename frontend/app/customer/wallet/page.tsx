'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, fetchCustomerWallet, type WalletTransaction } from '@/lib/customer-api'
import { CustomerBottomNav } from '@/components/customer/BottomNav'

export default function CustomerWalletPage() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      router.replace('/customer/login')
      return
    }

    fetchCustomerWallet(token)
      .then((data) => {
        setBalance(data.balance)
        setTransactions(data.transactions)
      })
      .catch(() => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.localStorage.removeItem(REFRESH_TOKEN_KEY)
        router.replace('/customer/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-35px_rgba(10,37,64,0.35)] md:p-6">
          <h1 className="text-3xl font-bold text-[#0A2540]">Wallet</h1>
          <p className="mt-1 text-sm text-slate-600">UPI, COD settlements, and transaction history.</p>

          <div className="mt-5 rounded-2xl bg-gradient-to-r from-[#0A2540] to-[#123A5E] p-5 text-white">
            <p className="text-sm text-slate-200">Available Balance</p>
            <p className="mt-1 text-4xl font-bold">{balance.toFixed(2)}</p>
          </div>

          <div className="mt-5 grid gap-3">
            {loading ? <p className="text-sm text-slate-500">Loading wallet...</p> : null}
            {!loading && transactions.map((txn) => (
              <article key={txn.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0A2540]">{txn.description || txn.type || 'Wallet transaction'}</p>
                    <p className="text-xs text-slate-500">{new Date(txn.createdAt || txn.created_at || new Date().toISOString()).toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-bold text-[#16A34A]">{Number(txn.amount || 0).toFixed(2)}</p>
                </div>
              </article>
            ))}
            {!loading && transactions.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">No wallet transactions yet.</p> : null}
          </div>
        </section>
      </div>
      <CustomerBottomNav />
    </main>
  )
}


