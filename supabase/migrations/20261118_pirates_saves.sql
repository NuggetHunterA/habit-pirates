-- Habit Pirates: ein Spielstand pro Profil, eigenes Schema "pirates" im Supabase-Projekt von Putzy.
-- Bereits angewendet (Migration "pirates_saves"). Hier zur Nachvollziehbarkeit.
create schema if not exists pirates;

create table if not exists pirates.saves (
  profile text primary key check (profile in ('Adrian', 'Ulrike')),
  data jsonb not null,
  updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (octet_length(data::text) < 2000000)
);

alter table pirates.saves enable row level security;
revoke all on schema pirates from public, anon, authenticated;
revoke all on all tables in schema pirates from public, anon, authenticated;

-- Zugriff nur ueber diese zwei Funktionen (Schema muss nicht in der API freigegeben werden).
create or replace function public.pirates_load(p_profile text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object('data', s.data, 'updated_at', s.updated_at)
  from pirates.saves s
  where s.profile = p_profile;
$$;

-- Speichert nur, wenn der Stand neuer ist. Gibt immer den gespeicherten Stand zurueck,
-- damit ein Geraet mit aelterem Stand den neueren uebernimmt.
create or replace function public.pirates_save(p_profile text, p_data jsonb, p_updated_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
begin
  insert into pirates.saves as s (profile, data, updated_at)
  values (p_profile, p_data, p_updated_at)
  on conflict (profile) do update
    set data = excluded.data, updated_at = excluded.updated_at
    where excluded.updated_at > s.updated_at;
  select jsonb_build_object('data', s.data, 'updated_at', s.updated_at) into r
  from pirates.saves s where s.profile = p_profile;
  return r;
end;
$$;

revoke all on function public.pirates_load(text) from public;
revoke all on function public.pirates_save(text, jsonb, timestamptz) from public;
grant execute on function public.pirates_load(text) to anon, authenticated;
grant execute on function public.pirates_save(text, jsonb, timestamptz) to anon, authenticated;
