'use client'

import { useState } from 'react'

export default function CustomerSupportPage() {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  function submitTicket() {
    if (!subject.trim() || !description.trim()) {
      setMessage('Please enter subject and description')
      return
    }
    const tickets = JSON.parse(window.localStorage.getItem('vinayaka_support_tickets') || '[]') as Array<any>
    tickets.unshift({ id: `t-${Date.now()}`, subject, description, createdAt: new Date().toISOString() })
    window.localStorage.setItem('vinayaka_support_tickets', JSON.stringify(tickets))
    setSubject('')
    setDescription('')
    setMessage('Support ticket created successfully')
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-bold text-slate-900">Customer Support</h1>
          <p className="mt-1 text-sm text-slate-500">Raise support tickets and connect with operations team.</p>

          <div className="mt-4 grid gap-2">
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ticket subject" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe your issue" className="min-h-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            <button onClick={submitTicket} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Create Ticket</button>
          </div>

          {message ? <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p> : null}
        </section>
      </div>
    </main>
  )
}
