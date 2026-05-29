import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import { ViewportProvider } from '@/components/system/ViewportProvider';
import { PWARegister } from '@/components/system/PWARegister';

export const metadata: Metadata = {
  title: 'Adventure Roulette',
  description: 'A spontaneous nearby adventure generator.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Adventure' },
  icons: { apple: '/icons/apple-touch-icon.png', icon: [{ url: '/icons/icon-192.png', sizes: '192x192' }, { url: '/icons/icon-512.png', sizes: '512x512' }] }
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover', themeColor: '#050507' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><ViewportProvider>{children}<PWARegister /></ViewportProvider></body></html>;
}
