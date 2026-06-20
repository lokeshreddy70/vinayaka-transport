import '@/styles/globals.css'

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
      <body className="dark:bg-slate-950 dark:text-white">
        {children}
      </body>
    </html>
  )
}
