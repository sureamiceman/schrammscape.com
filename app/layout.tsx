import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SchrammScape Lawncare',
  description: 'Professional lawn care services. Started at 14 with a push mower, now serving the community.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
