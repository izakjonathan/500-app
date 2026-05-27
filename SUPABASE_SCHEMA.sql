create table if not exists public.rummy_current_game (
  id text primary key,
  game_state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rummy_current_game enable row level security;

create policy "public read"
on public.rummy_current_game
for select
using (true);

create policy "public insert"
on public.rummy_current_game
for insert
with check (true);

create policy "public update"
on public.rummy_current_game
for update
using (true)
with check (true);

alter publication supabase_realtime add table public.rummy_current_game;
