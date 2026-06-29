'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type OfferTab = 'ALL' | 'RIDES' | 'DELIVERY' | 'WALLET'

const offers = [
  { id: 'o1', tab: 'RIDES', title: '20% OFF on 3 rides', code: 'VINAYAKA20', color: 'from-[#0d4fbf] to-[#0e7cd8]' },
  { id: 'o2', tab: 'DELIVERY', title: 'Flat 30 OFF on Parcel Delivery', code: 'PARCEL30', color: 'from-[#0ea5e9] to-[#22c1dd]' },
  { id: 'o3', tab: 'WALLET', title: '10% Cashback on Add Money', code: 'CASH10', color: 'from-[#f59e0b] to-[#fbbf24]' },
]

export default function CustomerOffersPage() {
  const router = useRouter()
  const [tab, setTab] = useState<OfferTab>('ALL')
  const [message, setMessage] = useState('')

  const visible = tab === 'ALL' ? offers : offers.filter((item) => item.tab === tab)

  return (
    <main className="min-h-screen bg-[#eef3fb] px-4 py-6">
      <div className="mx-auto max-w-md">
        <section className="rounded-[28px] border border-[#e2e8f0] bg-white px-4 py-4 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.4)]">
          <h1 className="text-2xl font-bold text-[#0f172a]">Offers</h1>
          <div className="mt-3 flex gap-2">
            {(['ALL', 'RIDES', 'DELIVERY', 'WALLET'] as OfferTab[]).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${tab === item ? 'bg-[#2563eb] text-white' : 'bg-[#f1f5f9] text-[#475569]'}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {visible.map((offer) => (
              <article key={offer.id} className={`rounded-2xl bg-gradient-to-r ${offer.color} px-4 py-4 text-white`}>
                <p className="text-lg font-bold">{offer.title}</p>
                <p className="mt-1 text-xs text-white/90">Code: {offer.code}</p>
                <button
                  onClick={() => {
                    window.localStorage.setItem('vinayaka_last_coupon', offer.code)
                    setMessage(`Coupon ${offer.code} selected`)
                    router.push('/customer/book')
                  }}
                  className="mt-3 rounded-xl bg-white/20 px-3 py-2 text-xs font-semibold"
                >
                  Use This Offer
                </button>
              </article>
            ))}
          </div>

          {message ? <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">{message}</p> : null}
        </section>
      </div>
    </main>
  )
}
