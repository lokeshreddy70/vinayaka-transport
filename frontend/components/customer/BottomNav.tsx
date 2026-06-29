'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, History, MapPinned, Wallet, User } from 'lucide-react'

const navItems = [
  { href: '/customer', label: 'Home', icon: Home },
  { href: '/customer/orders', label: 'Orders', icon: History },
  { href: '/customer/tracking', label: 'Tracking', icon: MapPinned },
  { href: '/customer/wallet', label: 'Wallet', icon: Wallet },
  { href: '/customer/profile', label: 'Profile', icon: User },
]

export function CustomerBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E5E7EB] bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs font-semibold transition ${active ? 'text-[#111827]' : 'text-[#6B7280]'}`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-[#2563EB]' : 'text-[#94A3B8]'}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
