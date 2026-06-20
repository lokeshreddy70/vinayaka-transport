'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, MapPin, DollarSign, User, LogOut, Menu, X, Home, History, Wallet } from 'lucide-react'

export default function CustomerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && <h2 className="font-bold text-orange-500">Vinayaka</h2>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { icon: Home, label: 'Home', href: '/customer' },
            { icon: Package, label: 'Send Parcel', href: '/customer/book' },
            { icon: History, label: 'Orders', href: '/customer/orders' },
            { icon: Wallet, label: 'Wallet', href: '/customer/wallet' },
            { icon: MapPin, label: 'Addresses', href: '/customer/addresses' },
            { icon: User, label: 'Profile', href: '/customer/profile' },
          ].map((item, i) => (
            <Link key={i} href={item.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 transition text-gray-300 hover:text-white">
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-700 transition text-gray-300 hover:text-white">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
              R
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'Active Orders', value: '0', icon: '📦', color: 'from-blue-500' },
              { label: 'Total Spent', value: '₹0', icon: '💳', color: 'from-green-500' },
              { label: 'Wallet Balance', value: '₹0', icon: '👛', color: 'from-orange-500' },
              { label: 'Loyalty Points', value: '0', icon: '⭐', color: 'from-purple-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className="text-3xl">{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Send Parcel CTA */}
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to send a parcel?</h2>
            <Link href="/customer/book" className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition inline-block">
              Send Parcel Now
            </Link>
          </div>

          {/* Recent Orders */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Recent Orders</h3>
            <div className="text-center py-12 text-gray-400">
              <p>No orders yet. <Link href="/customer/book" className="text-orange-500 hover:underline">Send your first parcel!</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
