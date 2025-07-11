import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TravelowKey - Your Travel Companion',
  description: 'Book flights, hotels, and car rentals with ease. Find the best deals and plan your perfect trip.',
  keywords: 'travel, booking, flights, hotels, car rental, vacation, trip',
  authors: [{ name: 'TravelowKey Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'TravelowKey - Your Travel Companion',
    description: 'Book flights, hotels, and car rentals with ease. Find the best deals and plan your perfect trip.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravelowKey - Your Travel Companion',
    description: 'Book flights, hotels, and car rentals with ease. Find the best deals and plan your perfect trip.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
