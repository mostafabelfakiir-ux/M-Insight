import type { Metadata } from 'next'
import { Cairo, Inter } from 'next/font/google'
import './globals.css'

const cairo = Cairo({ variable: '--font-cairo', subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'] })
const inter = Inter({ variable: '--font-inter', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Hisabi — نظام إدارة الأعمال',
  description: 'Hisabi — نظام مالي مغربي لإدارة الدخل والمصاريف والمهام والعملاء.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      className={`${cairo.variable} ${inter.variable} h-full antialiased`}
    >
      <head />
      <body className="h-full">
        {children}
      </body>
    </html>
  )
}
