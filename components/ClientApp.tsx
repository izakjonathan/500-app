'use client';

import dynamic from 'next/dynamic';

const AdventureApp = dynamic(() => import('@/components/AdventureApp').then((mod) => mod.AdventureApp), {
  ssr: false,
  loading: () => <main className="app-shell"><div className="bg-scene" /><section className="content-stack"><p className="eyebrow">Adventure Roulette</p></section></main>
});

export function ClientApp() {
  return <AdventureApp />;
}
