export const metadata = {
  title: 'MoneYudi',
  description: 'Catat pengeluaran mudah & cepat',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  themeColor: '#111827',
}

import './globals.css'
import PWAProvider from '../components/PWAProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-white text-gray-900">
        <PWAProvider />
        {children}
      </body>
    </html>
  )
}
