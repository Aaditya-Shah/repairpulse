import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-client'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'RepairPulse - Smarter Predictions. Smoother Schedules.',
  description: 'AI-assisted repair platform solving the Dashboard Illusion',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-rp-bg-soft text-rp-text">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}