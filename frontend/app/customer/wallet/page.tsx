'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, BadgePercent, Plus, Send, Wallet } from 'lucide-react'
import {
  ACCESS_TOKEN_KEY,
  addDemoWalletTransaction,
  fetchCustomerWallet,
  getDemoWallet,
  type WalletTransaction,
} from '@/lib/customer-api'
import { CustomerBottomNav } from '@/components/customer/BottomNav'

export default function CustomerWalletPage() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [walletAction, setWalletAction] = useState<'add' | 'send' | null>(null)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')

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
        const local = getDemoWallet()
        setBalance(local.balance)
        setTransactions(local.transactions)
      })
  }, [router])

  function startAction(action: 'add' | 'send') {
    setWalletAction(action)
    setAmount(action === 'add' ? '500' : '100')
  }

  function applyOffer() {
    const bonus = Math.max(40, Math.round(balance * 0.02))
    const next = addDemoWalletTransaction(bonus, 'Offer Cashback', 'CREDIT')
    setBalance(next.balance)
    setTransactions(next.transactions)
    setMessage(`Offer applied. Cashback ${bonus.toFixed(2)}`)
  }

  function submitAction() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setMessage('Enter valid amount')
      return
    }

    if (walletAction === 'send' && value > balance) {
      setMessage('Insufficient balance')
      return
    }

    const next = addDemoWalletTransaction(value, walletAction === 'add' ? 'Added Money' : 'Sent Money', walletAction === 'add' ? 'CREDIT' : 'DEBIT')
    setBalance(next.balance)
    setTransactions(next.transactions)
    setMessage(walletAction === 'add' ? `Added ${value.toFixed(2)}` : `Sent ${value.toFixed(2)}`)
    setWalletAction(null)
    setAmount('')
  }

  return (
    <main className="min-h-screen bg-[#eef3fb] pb-24">
      <div className="mx-auto max-w-md px-4 py-5">
        <section className="rounded-[28px] border border-[#e2e8f0] bg-white px-4 py-4 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.4)]">
          <h1 className="text-2xl font-bold text-[#0f172a]">Wallet</h1>

          <div className="mt-3 rounded-2xl bg-[linear-gradient(115deg,#0a356f,#0a5bb4)] px-4 py-4 text-white">
            <p className="text-xs text-blue-100">Available Balance</p>
            <p className="mt-1 text-3xl font-bold">{balance.toFixed(2)}</p>
            <button onClick={() => startAction('add')} className="mt-2 inline-flex items-center gap-1 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <button onClick={() => startAction('add')} className="rounded-xl border border-[#e2e8f0] bg-white px-2 py-2 text-[11px] font-semibold text-[#334155]">
              <Plus className="mx-auto mb-1 h-4 w-4 text-[#2563eb]" />
              Add Money
            </button>
            <button onClick={() => startAction('send')} className="rounded-xl border border-[#e2e8f0] bg-white px-2 py-2 text-[11px] font-semibold text-[#334155]">
              <Send className="mx-auto mb-1 h-4 w-4 text-[#2563eb]" />
              Send
            </button>
            <button onClick={() => setMessage('Recent transactions shown below')} className="rounded-xl border border-[#e2e8f0] bg-white px-2 py-2 text-[11px] font-semibold text-[#334155]">
              <ArrowLeftRight className="mx-auto mb-1 h-4 w-4 text-[#2563eb]" />
              Txns
            </button>
            <button onClick={applyOffer} className="rounded-xl border border-[#e2e8f0] bg-white px-2 py-2 text-[11px] font-semibold text-[#334155]">
              <BadgePercent className="mx-auto mb-1 h-4 w-4 text-[#2563eb]" />
              Offers
            </button>
          </div>

          {walletAction ? (
            <div className="mt-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">{walletAction === 'add' ? 'Add Money' : 'Send Money'}</p>
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" placeholder="Amount" className="rounded-xl border border-[#dbe5f4] bg-white px-3 py-2 text-sm" />
                <button onClick={submitAction} className="rounded-xl bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white">Confirm</button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0f172a]">Recent Transactions</h2>
            <button onClick={() => router.push('/customer/payments')} className="text-xs font-semibold text-[#2563eb]">View All</button>
          </div>

          <div className="mt-2 space-y-2">
            {transactions.slice(0, 6).map((txn) => {
              const value = Number(txn.amount || 0)
              return (
                <article key={txn.id} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#0f172a]">{txn.description || txn.type || 'Wallet transaction'}</p>
                      <p className="text-[10px] text-[#64748b]">{new Date(txn.createdAt || txn.created_at || new Date().toISOString()).toLocaleDateString()}</p>
                    </div>
                    <p className={`text-xs font-bold ${value >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                      {value >= 0 ? '+' : ''}{value.toFixed(2)}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>

          <button onClick={() => router.push('/customer/offers')} className="mt-4 inline-flex items-center gap-1 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-semibold text-[#334155]">
            <Wallet className="h-3.5 w-3.5 text-[#2563eb]" /> View Offer Wallet Benefits
          </button>

          {message ? <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">{message}</p> : null}
        </section>
      </div>
      <CustomerBottomNav />
    </main>
  )
}
