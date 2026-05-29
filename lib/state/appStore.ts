'use client';
import { create } from 'zustand';
import type { AdventureMode, AdventurePlace, Coordinates } from '@/lib/types';
import { safeRead, safeWrite } from '@/lib/storage/localStorage';
import { generateAdventure } from '@/lib/api/client';

type Phase = 'idle' | 'locating' | 'spinning' | 'revealing' | 'revealed' | 'error';
type Store = {
  mode: AdventureMode; radiusMeters: number; discovery: boolean; phase: Phase; coords?: Coordinates; current?: AdventurePlace; error?: string; recent: AdventurePlace[]; memory: string[]; hydrated: boolean; stale: boolean;
  hydrate: () => void; setMode: (mode: AdventureMode) => void; setRadius: (radius: number) => void; setDiscovery: (value: boolean) => void; locate: () => Promise<Coordinates | undefined>; generate: () => Promise<void>; clearRecent: () => void; clearMemory: () => void;
};
const RECENT_KEY = 'ar:recent:v1'; const MEMORY_KEY = 'ar:memory:v1';
export const useAppStore = create<Store>((set, get) => ({
  mode: 'explore', radiusMeters: 1800, discovery: true, phase: 'idle', recent: [], memory: [], hydrated: false, stale: false,
  hydrate: () => set({ recent: safeRead<AdventurePlace[]>(RECENT_KEY, []), memory: safeRead<string[]>(MEMORY_KEY, []), hydrated: true }),
  setMode: (mode) => set({ mode, radiusMeters: mode === 'bus' ? 7000 : mode === 'nature' ? 3000 : 1800 }),
  setRadius: (radiusMeters) => set({ radiusMeters }), setDiscovery: (discovery) => set({ discovery }),
  locate: async () => {
    const existing = get().coords; if (existing) return existing;
    if (!('geolocation' in navigator)) return undefined;
    set({ phase: 'locating' });
    return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
      (pos) => { const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }; set({ coords }); resolve(coords); },
      () => { set({ coords: undefined }); resolve(undefined); },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 120000 }
    ));
  },
  generate: async () => {
    const state = get();
    set({ phase: 'locating', error: undefined, stale: false });
    const coords = await get().locate();
    set({ phase: 'spinning' });
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) { navigator.vibrate?.(8); }
    const minSpin = new Promise((r) => setTimeout(r, 2450));
    try {
      const [result] = await Promise.all([generateAdventure({ mode: state.mode, radiusMeters: state.radiusMeters, discovery: state.discovery, recentIds: state.memory, coords }), minSpin]);
      const recent = [result.adventure, ...get().recent.filter((p) => p.id !== result.adventure.id)].slice(0, 8);
      const memory = [result.adventure.id, ...get().memory.filter((id) => id !== result.adventure.id)].slice(0, 40);
      safeWrite(RECENT_KEY, recent); safeWrite(MEMORY_KEY, memory);
      set({ current: result.adventure, recent, memory, stale: Boolean(result.stale), phase: 'revealing' });
      window.setTimeout(() => set({ phase: 'revealed' }), 320);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) { navigator.vibrate?.([10, 30, 12]); }
    } catch (err) { set({ phase: 'error', error: err instanceof Error ? err.message : 'Something went wrong' }); }
  },
  clearRecent: () => { safeWrite(RECENT_KEY, []); set({ recent: [] }); },
  clearMemory: () => { safeWrite(MEMORY_KEY, []); set({ memory: [] }); }
}));
