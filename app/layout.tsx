import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Project Management Dashboard',
  description: 'A clean, professional project management tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased">
        {children}
      </body>
    </html>
  )
}