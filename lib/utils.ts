import type { Coordinates } from './types';
export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
export function formatDistance(meters?: number) { if (!Number.isFinite(meters ?? NaN)) return 'Distance unknown'; const v = meters ?? 0; return v < 1000 ? `${Math.round(v)} m` : `${(v / 1000).toFixed(v < 10000 ? 1 : 0)} km`; }
export function estimateWalkMinutes(meters?: number) { return meters ? Math.max(2, Math.round(meters / 80)) : undefined; }
export function distanceMeters(a: Coordinates, b: Coordinates) { const R = 6371000, rad = (v:number)=>(v*Math.PI)/180; const dLat=rad(b.lat-a.lat), dLon=rad(b.lon-a.lon), lat1=rad(a.lat), lat2=rad(b.lat); const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
export function pickFresh<T>(items: T[], recent: Set<string>, getId: (item: T) => string) { const fresh = items.filter((item) => !recent.has(getId(item))); const pool = fresh.length ? fresh : items; return pool[Math.floor(Math.random() * pool.length)]; }
