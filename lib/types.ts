export type AdventureMode = 'bars' | 'nature' | 'explore' | 'bus';
export type Coordinates = { lat: number; lon: number };
export type AdventurePlace = {
  id: string; name: string; mode: AdventureMode; lat?: number; lon?: number;
  distanceMeters?: number; totalWalkMeters?: number; estimatedMinutes?: number;
  subtitle: string; description: string; tags: string[]; source: 'overpass' | 'fallback' | 'bus';
};
export type GenerateRequest = { mode: AdventureMode; radiusMeters: number; discovery: boolean; recentIds: string[]; coords?: Coordinates };
export type GenerateResponse = { adventure: AdventurePlace; stale?: boolean; error?: string };
