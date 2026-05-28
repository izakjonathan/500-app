-- Optional future multiplayer schema for invite/share games.
-- Current app still uses rummy_current_game for the active live game.

create table if not exists public.rummy_games (
  id text primary key,
  access_code text unique not null,
  game_state jsonb not null,
  owner_client_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rummy_game_events (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.rummy_games(id) on delete cascade,
  client_id text,
  event_type text not null,
  event_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rummy_presence (
  game_id text not null references public.rummy_games(id) on delete cascade,
  client_id text not null,
  display_name text,
  last_seen timestamptz not null default now(),
  primary key(game_id, client_id)
);
