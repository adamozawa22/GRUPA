-- ============================================================
-- Genzie Hub — tabela z zapisami "będę / nie będę" na spotkania
-- Uruchom to w Supabase: Twój projekt -> SQL Editor -> New query
-- ============================================================

create table if not exists public.spotkania_rsvp (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meeting_id text not null,
  bedzie boolean not null,
  godzina time,
  updated_at timestamptz not null default now(),
  unique (user_id, meeting_id)
);

-- włącz RLS (Row Level Security) — bez tego nikt by nic nie mógł zapisać/przeczytać
alter table public.spotkania_rsvp enable row level security;

-- każdy zalogowany widzi TYLKO swoją odpowiedź
create policy "user widzi swoje rsvp"
  on public.spotkania_rsvp
  for select
  using (auth.uid() = user_id);

-- każdy zalogowany może dodać TYLKO swoją odpowiedź
create policy "user dodaje swoje rsvp"
  on public.spotkania_rsvp
  for insert
  with check (auth.uid() = user_id);

-- każdy zalogowany może zaktualizować TYLKO swoją odpowiedź
create policy "user aktualizuje swoje rsvp"
  on public.spotkania_rsvp
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- (opcjonalnie) żeby TY jako admin mogłeś podejrzeć wszystkie
-- odpowiedzi wszystkich osób, nie musisz nic dodatkowo robić —
-- wejdź w Supabase Dashboard -> Table Editor -> spotkania_rsvp.
-- Dashboard łączy się kluczem serwisowym, więc RLS go nie dotyczy.
-- ============================================================
