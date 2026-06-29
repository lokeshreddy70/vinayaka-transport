import '@/styles/globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

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
      <body className={`${inter.variable} min-h-screen bg-[#F8FAFC] text-[#111827]`}>
        {children}
      </body>
    </html>
  )
}
