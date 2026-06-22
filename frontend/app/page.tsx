'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Truck } from 'lucide-react'

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Truck className="w-8 h-8 text-orange-500" />
            <h1 className="text-2xl font-bold text-white">Vinayaka Transport</h1>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8 items-center">
            <Link href="#features" className="text-gray-300 hover:text-white transition">Features</Link>
            <Link href="#routes" className="text-gray-300 hover:text-white transition">Routes</Link>
            <Link href="#about" className="text-gray-300 hover:text-white transition">About</Link>
            <Link href="/login" className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-700 p-4 space-y-4">
            <Link href="#features" className="block text-gray-300 hover:text-white">Features</Link>
            <Link href="#routes" className="block text-gray-300 hover:text-white">Routes</Link>
            <Link href="/login" className="block bg-orange-500 text-white px-6 py-2 rounded-lg text-center">
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Move Anything.<br />Anywhere.<br />Anytime.
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            India's fastest growing hyperlocal and intercity delivery platform. 
            Built for scale, optimized for speed.
          </p>

          <div className="flex gap-4 justify-center mb-12">
            <Link href="/login" className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
              Operations Login
            </Link>
            <Link href="/rider" className="bg-slate-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-600 transition">
              Become a Rider
            </Link>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-slate-700">
              <div className="text-4xl font-bold text-orange-500 mb-2">50K+</div>
              <p className="text-gray-300">Active Users</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-slate-700">
              <div className="text-4xl font-bold text-blue-500 mb-2">5K+</div>
              <p className="text-gray-300">Active Riders</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-slate-700">
              <div className="text-4xl font-bold text-green-500 mb-2">1M+</div>
              <p className="text-gray-300">Deliveries</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 md:px-8 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-4xl font-bold text-center mb-12">Why Choose Vinayaka?</h3>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Lightning Fast',
                desc: 'Deliveries in minutes, not hours'
              },
              {
                icon: '🔒',
                title: 'Secure & Verified',
                desc: 'All riders verified with Aadhaar & DL'
              },
              {
                icon: '📍',
                title: 'Real-time Tracking',
                desc: 'Live GPS tracking of your parcels'
              },
              {
                icon: '💰',
                title: 'Transparent Pricing',
                desc: 'No hidden charges, AI-powered pricing'
              },
              {
                icon: '🌾',
                title: 'Village Ready',
                desc: 'Delivery to farms, villages & remote areas'
              },
              {
                icon: '📱',
                title: 'Mobile First',
                desc: 'Optimized for Android & iOS'
              },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Routes Section */}
      <section id="routes" className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-4xl font-bold text-center mb-12">Service Routes</h3>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { city: 'Nellore', emoji: '🏙️', radius: '40 KM' },
              { city: 'Podalakur', emoji: '🌾', radius: '15 KM' },
              { city: 'Tirupati', emoji: '🏛️', radius: '30 KM' },
            ].map((route, i) => (
              <div key={i} className="bg-gradient-to-br from-orange-500/20 to-blue-500/20 p-8 rounded-lg border border-orange-500/30 text-center">
                <div className="text-5xl mb-4">{route.emoji}</div>
                <h4 className="text-2xl font-bold mb-2">{route.city}</h4>
                <p className="text-gray-300 mb-4">Service Radius: {route.radius}</p>
                <button className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition">
                  Learn More
                </button>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/50 backdrop-blur p-8 rounded-lg border border-slate-700 text-center">
            <p className="text-lg text-gray-300 mb-4">Expanding to entire Andhra Pradesh, South India, and all of India</p>
            <p className="text-orange-400 font-semibold">Coming Soon: Intercity Routes, Express Delivery, Scheduled Deliveries</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-12 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-white font-bold mb-4">Vinayaka Transport</h4>
            <p className="text-gray-400 text-sm">India's fastest growing logistics platform</p>
          </div>
          <div>
            <h5 className="text-white font-bold mb-4">Product</h5>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/" className="hover:text-white">For Customers</Link></li>
              <li><Link href="/" className="hover:text-white">For Riders</Link></li>
              <li><Link href="/" className="hover:text-white">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold mb-4">Company</h5>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/" className="hover:text-white">About Us</Link></li>
              <li><Link href="/" className="hover:text-white">Careers</Link></li>
              <li><Link href="/" className="hover:text-white">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold mb-4">Legal</h5>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/" className="hover:text-white">Privacy</Link></li>
              <li><Link href="/" className="hover:text-white">Terms</Link></li>
              <li><Link href="/" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Vinayaka Transport. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
