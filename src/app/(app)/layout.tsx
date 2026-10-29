import React from 'react'

export const metadata = {
  title: 'Payload reproduction',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
