'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ShieldCheck } from 'lucide-react'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, fetchCustomerProfile, getCustomerName, type CustomerProfile } from '@/lib/customer-api'
import { CustomerBottomNav } from '@/components/customer/BottomNav'

export default function CustomerProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [tripShareEnabled, setTripShareEnabled] = useState(true)

  useEffect(() => {
    try {
      const notifications = window.localStorage.getItem('vinayaka_notifications_enabled')
      const tripShare = window.localStorage.getItem('vinayaka_trip_share_enabled')
      if (notifications !== null) {
        setNotificationsEnabled(notifications === 'true')
      }
      if (tripShare !== null) {
        setTripShareEnabled(tripShare === 'true')
      }
    } catch {
      // Ignore local storage read failures.
    }
  }, [])

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      router.replace('/customer/login')
      return
    }

    fetchCustomerProfile(token)
      .then(setProfile)
      .catch(() => {
        // Keep session until the user logs out manually.
      })
      .finally(() => setLoading(false))
  }, [router])

  const logout = () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    router.replace('/customer/login')
  }

  function updatePreference(key: string, value: boolean, setter: (next: boolean) => void) {
    setter(value)
    try {
      window.localStorage.setItem(key, String(value))
    } catch {
      // Ignore local storage write failures.
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-35px_rgba(10,37,64,0.35)] md:p-6">
          <h1 className="text-3xl font-bold text-[#0A2540]">Profile</h1>
          {loading ? <p className="mt-2 text-sm text-slate-600">Loading profile...</p> : null}

          {!loading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Name</p>
                <p className="mt-1 text-lg font-semibold text-[#0A2540]">{getCustomerName(profile)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
                <p className="mt-1 text-lg font-semibold text-[#0A2540]">{profile?.user?.email || 'Not available'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Phone</p>
                <p className="mt-1 text-lg font-semibold text-[#0A2540]">{profile?.user?.phoneNumber || profile?.user?.phone || 'Not available'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Loyalty Points</p>
                <p className="mt-1 text-lg font-semibold text-[#0A2540]">{profile?.loyaltyPoints || 0}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-[#0A2540]">Preferences</p>
            <div className="mt-3 space-y-2">
              <label className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#2563EB]" />
                  Push notifications
                </span>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(event) =>
                    updatePreference('vinayaka_notifications_enabled', event.target.checked, setNotificationsEnabled)
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
                  Trip sharing
                </span>
                <input
                  type="checkbox"
                  checked={tripShareEnabled}
                  onChange={(event) =>
                    updatePreference('vinayaka_trip_share_enabled', event.target.checked, setTripShareEnabled)
                  }
                />
              </label>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:flex">
            <a href="tel:+919876543210" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
              Call Support
            </a>
            <a href="mailto:support@vinayakatransport.com" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
              Email Support
            </a>
          </div>

          <button onClick={logout} className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Logout
          </button>
        </section>
      </div>
      <CustomerBottomNav />
    </main>
  )
}


