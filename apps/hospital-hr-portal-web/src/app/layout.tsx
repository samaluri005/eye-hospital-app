import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Eye Hospital HR Portal',
  description: 'Hospital HR and management portal for eye hospital management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}