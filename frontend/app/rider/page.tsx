'use client'

import { useState } from 'react'
import { MapPin, Activity, DollarSign, TrendingUp, Navigation, Phone } from 'lucide-react'

export default function RiderDashboard() {
  const [isOnline, setIsOnline] = useState(false)

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-white">Rider Dashboard</h1>
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`px-6 py-2 rounded-full font-semibold transition ${
            isOnline ? 'bg-green-500 text-white' : 'bg-slate-700 text-gray-300'
          }`}
        >
          {isOnline ? '🟢 Online' : '⚫ Offline'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { label: 'Today Earnings', value: '₹0', icon: '💰', color: 'from-green-500' },
            { label: 'Active Orders', value: '0', icon: '📦', color: 'from-blue-500' },
            { label: 'Completed', value: '0', icon: '✅', color: 'from-orange-500' },
            { label: 'Rating', value: '0', icon: '⭐', color: 'from-yellow-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Map Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Map integration - Coming soon</p>
            <p className="text-sm text-gray-500 mt-2">Real-time location tracking & order map</p>
          </div>
        </div>

        {/* Available Orders */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">🔥 Nearby Orders</h3>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center hover:bg-slate-700/70 transition cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <p className="font-semibold text-white">Nellore → Podalakur</p>
                  </div>
                  <p className="text-sm text-gray-400">📦 Documents • ₹149 • 2.5 KM</p>
                </div>
                <button className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 transition">
                  Accept
                </button>
              </div>
            ))}
          </div>

          {isOnline ? (
            <div className="mt-6 text-center text-gray-400">
              <p>No more orders nearby. Keep checking!</p>
            </div>
          ) : (
            <div className="mt-6 text-center bg-slate-700/50 p-4 rounded-lg">
              <p className="text-gray-300">Go online to see available orders</p>
            </div>
          )}
        </div>

        {/* Earnings Summary */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">📊 Earnings This Week</h3>
          <div className="grid md:grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-gray-400 mb-2">{day}</p>
                <div className="bg-slate-700 h-16 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400 text-sm">₹0</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
