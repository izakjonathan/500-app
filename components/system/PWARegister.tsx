'use client';
import { useEffect, useState } from 'react';
export function PWARegister() {
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(true); });
      });
    }).catch(() => undefined);
  }, []);
  if (!updateReady) return null;
  return <button className="update-toast" onClick={() => window.location.reload()}>Update ready — tap to refresh</button>;
}
