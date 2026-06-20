'use client'

import { BarChart, LineChart, User, Settings, LogOut, TrendingUp, Users, Package, DollarSign } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-orange-500">Vinayaka Admin</h2>
        </div>

        <nav className="p-4 space-y-2">
          {[
            { icon: '📊', label: 'Dashboard', href: '#' },
            { icon: '📦', label: 'Orders', href: '#' },
            { icon: '👥', label: 'Riders', href: '#' },
            { icon: '👤', label: 'Customers', href: '#' },
            { icon: '💳', label: 'Payments', href: '#' },
            { icon: '💰', label: 'Payouts', href: '#' },
            { icon: '🎯', label: 'Pricing', href: '#' },
            { icon: '📍', label: 'Zones', href: '#' },
            { icon: '🏢', label: 'Franchises', href: '#' },
            { icon: '⚙️', label: 'Settings', href: '#' },
          ].map((item, i) => (
            <a key={i} href={item.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 transition text-gray-300 hover:text-white">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-700 transition text-gray-300 hover:text-white">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-700 rounded-lg">
              <Settings className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* KPI Cards */}
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'Revenue Today', value: '₹45,230', change: '+12.5%', icon: '💰', color: 'from-green-500' },
              { label: 'Active Orders', value: '324', change: '+8.2%', icon: '📦', color: 'from-blue-500' },
              { label: 'Active Riders', value: '156', change: '+5.1%', icon: '👥', color: 'from-orange-500' },
              { label: 'Customers', value: '12,542', change: '+3.4%', icon: '👤', color: 'from-purple-500' },
            ].map((kpi, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">{kpi.label}</p>
                    <p className="text-3xl font-bold text-white">{kpi.value}</p>
                  </div>
                  <span className="text-3xl">{kpi.icon}</span>
                </div>
                <p className="text-green-400 text-sm">{kpi.change} from yesterday</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">📊 Revenue Trend</h3>
              <div className="h-64 bg-slate-700/50 rounded-lg flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <LineChart className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                  <p>Chart visualization coming soon</p>
                </div>
              </div>
            </div>

            {/* Orders Chart */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">📈 Orders by Status</h3>
              <div className="h-64 bg-slate-700/50 rounded-lg flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <BarChart className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                  <p>Chart visualization coming soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">📋 Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-gray-400 font-semibold">Order ID</th>
                    <th className="px-4 py-3 text-gray-400 font-semibold">Customer</th>
                    <th className="px-4 py-3 text-gray-400 font-semibold">Route</th>
                    <th className="px-4 py-3 text-gray-400 font-semibold">Status</th>
                    <th className="px-4 py-3 text-gray-400 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3 text-white">#ORD{1000 + i}</td>
                      <td className="px-4 py-3 text-gray-300">Customer {i}</td>
                      <td className="px-4 py-3 text-gray-300">Nellore → Podalakur</td>
                      <td className="px-4 py-3">
                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                          Delivered
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold">₹{149 + i * 10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
