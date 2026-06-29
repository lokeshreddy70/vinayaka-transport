'use client'

import { useEffect, useState } from 'react'

export default function CustomerSettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [location, setLocation] = useState(true)

  useEffect(() => {
    const n = window.localStorage.getItem('vinayaka_notifications_enabled')
    const l = window.localStorage.getItem('vinayaka_location_enabled')
    if (n !== null) setNotifications(n === 'true')
    if (l !== null) setLocation(l === 'true')
  }, [])

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage privacy, notifications, and location preferences.</p>

          <div className="mt-4 space-y-2">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              Push notifications
              <input
                type="checkbox"
                checked={notifications}
                onChange={(event) => {
                  const next = event.target.checked
                  setNotifications(next)
                  window.localStorage.setItem('vinayaka_notifications_enabled', String(next))
                }}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              Share live location
              <input
                type="checkbox"
                checked={location}
                onChange={(event) => {
                  const next = event.target.checked
                  setLocation(next)
                  window.localStorage.setItem('vinayaka_location_enabled', String(next))
                }}
              />
            </label>
          </div>
        </section>
      </div>
    </main>
  )
}
