'use client';
import { useEffect, type ReactNode } from 'react';
export function ViewportProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty('--app-height', `${height}px`);
      root.style.setProperty('--vv-offset-top', `${window.visualViewport?.offsetTop ?? 0}px`);
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => { window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
  }, []);
  return <>{children}</>;
}
