import '@/styles/globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })

export const metadata = {
  title: 'Vinayaka Transport - Move Anything. Anywhere. Anytime.',
  description: 'Production-ready hyperlocal and intercity delivery platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} min-h-screen bg-[#F8FAFC] text-[#111827]`}>
        {children}
      </body>
    </html>
  )
}
