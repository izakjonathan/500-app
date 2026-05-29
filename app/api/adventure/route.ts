import { NextResponse } from 'next/server';
import type { AdventureMode, AdventurePlace, GenerateRequest } from '@/lib/types';
import { distanceMeters, estimateWalkMinutes, pickFresh } from '@/lib/utils';

export const runtime = 'nodejs';

type OverpassElement = { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
const fallback: Record<AdventureMode, Omit<AdventurePlace, 'id'>[]> = {
  bars: [
    { name: 'A small bar you have not planned for', mode: 'bars', subtitle: 'Let chance choose the first round', description: 'Walk towards a lively nearby street and pick the first warm-looking place with people inside.', tags: ['No overthinking', 'First drink'], source: 'fallback' },
    { name: 'A tiny café with evening energy', mode: 'bars', subtitle: 'Coffee, beer, or something in between', description: 'Find a place with soft light and sit somewhere you would normally pass by.', tags: ['Local', 'Cosy'], source: 'fallback' }
  ],
  nature: [
    { name: 'The closest green escape', mode: 'nature', subtitle: 'There and back counts as the adventure', description: 'Head to the nearest green space, take one full slow lap, then walk back without checking the route too often.', tags: ['Fresh air', 'Round trip'], source: 'fallback' }
  ],
  explore: [
    { name: 'The street you always ignore', mode: 'explore', subtitle: 'A deliberately pointless detour', description: 'Walk to a nearby unfamiliar street and find one strange detail worth remembering.', tags: ['Wander', 'Look up'], source: 'fallback' },
    { name: 'A random landmark hunt', mode: 'explore', subtitle: 'Find the oldest-looking thing nearby', description: 'Move through the area until you find a plaque, statue, unusual doorway, or odd sign.', tags: ['Curious', 'Slow'], source: 'fallback' }
  ],
  bus: [
    { name: 'Board the next useful bus', mode: 'bus', subtitle: 'Ride first, decide later', description: 'Take a bus in a direction you rarely choose. Stay on for the timer, then get off and explore the nearest interesting corner.', tags: ['Transit roulette'], source: 'bus' }
  ]
};
const modeQueries: Record<AdventureMode, string> = {
  bars: 'node["amenity"~"bar|pub|cafe"](around:RADIUS,LAT,LON);way["amenity"~"bar|pub|cafe"](around:RADIUS,LAT,LON);',
  nature: 'node["leisure"~"park|garden|nature_reserve"](around:RADIUS,LAT,LON);way["leisure"~"park|garden|nature_reserve"](around:RADIUS,LAT,LON);node["natural"~"wood|heath|grassland"](around:RADIUS,LAT,LON);way["natural"~"wood|heath|grassland"](around:RADIUS,LAT,LON);',
  explore: 'node["tourism"~"attraction|artwork|viewpoint|museum"](around:RADIUS,LAT,LON);way["tourism"~"attraction|artwork|viewpoint|museum"](around:RADIUS,LAT,LON);node["historic"](around:RADIUS,LAT,LON);way["historic"](around:RADIUS,LAT,LON);',
  bus: ''
};
async function fetchOverpass(input: GenerateRequest): Promise<AdventurePlace[]> {
  if (!input.coords || input.mode === 'bus') return [];
  const q = modeQueries[input.mode].replaceAll('RADIUS', String(input.radiusMeters)).replaceAll('LAT', String(input.coords.lat)).replaceAll('LON', String(input.coords.lon));
  const query = `[out:json][timeout:8];(${q});out center 40;`;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 9500);
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: query }), signal: controller.signal, next: { revalidate: 180 } });
    if (!res.ok) return [];
    const data = await res.json() as { elements?: OverpassElement[] };
    return (data.elements ?? []).map((el) => {
      const lat = el.lat ?? el.center?.lat; const lon = el.lon ?? el.center?.lon; if (!lat || !lon) return undefined;
      const dist = distanceMeters(input.coords!, { lat, lon }); const name = el.tags?.name || readableName(input.mode);
      return { id: `osm:${el.id}`, name, mode: input.mode, lat, lon, distanceMeters: dist, totalWalkMeters: input.mode === 'nature' ? dist * 2 : undefined, estimatedMinutes: estimateWalkMinutes(input.mode === 'nature' ? dist * 2 : dist), subtitle: subtitle(input.mode, dist), description: description(input.mode, name), tags: tags(input.mode), source: 'overpass' as const };
    }).filter(Boolean).slice(0, 40) as AdventurePlace[];
  } catch { return []; } finally { clearTimeout(timer); }
}
function readableName(mode: AdventureMode) { return mode === 'bars' ? 'A nearby bar or café' : mode === 'nature' ? 'A nearby green spot' : 'A nearby curiosity'; }
function subtitle(mode: AdventureMode, dist: number) { return mode === 'nature' ? `${(dist*2/1000).toFixed(1)} km total walking` : mode === 'bars' ? 'A nearby place for one spontaneous stop' : 'A nearby thing worth finding'; }
function description(mode: AdventureMode, name: string) { if (mode === 'nature') return `Walk to ${name}, take the scenic route around it, then return. The round trip is the point.`; if (mode === 'bars') return `Go to ${name}. Order one thing, sit somewhere unusual, and do not optimise the choice.`; return `Go to ${name}. Your mission is to notice three details you would normally miss.`; }
function tags(mode: AdventureMode) { return mode === 'bars' ? ['Nearby', 'One stop'] : mode === 'nature' ? ['There + back', 'Walking'] : ['Discover', 'Look closer']; }
function busAdventure(radius: number): AdventurePlace {
  const min = Math.max(8, Math.round(8 + Math.random() * 10 + radius / 900));
  return { id: `bus:${Date.now()}:${min}`, name: `Stay on the bus for ${min} minutes`, mode: 'bus', subtitle: 'Let the route decide the destination', description: 'Walk to the nearest useful bus stop. Take the first bus that feels vaguely right, stay on until the timer ends, then get off and explore one block in each direction.', estimatedMinutes: min, tags: ['Random ride', 'No planning'], source: 'bus' };
}
export async function POST(request: Request) {
  const input = await request.json() as GenerateRequest;
  if (!['bars','nature','explore','bus'].includes(input.mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  if (input.mode === 'bus') return NextResponse.json({ adventure: busAdventure(input.radiusMeters) });
  const places = await fetchOverpass(input);
  const recent = new Set(input.recentIds ?? []);
  const picked = pickFresh(places, recent, (p) => p.id);
  if (picked) return NextResponse.json({ adventure: picked });
  const fb = pickFresh(fallback[input.mode].map((p, i) => ({ ...p, id: `fallback:${input.mode}:${i}` })), recent, (p) => p.id)!;
  return NextResponse.json({ adventure: fb, stale: true });
}
