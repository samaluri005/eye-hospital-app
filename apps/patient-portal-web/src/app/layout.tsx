import React from "react";
import './globals.css'

export const metadata = {
  title: 'EyeCare Patient Portal',
  description: 'Advanced Eye Care Patient Portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
