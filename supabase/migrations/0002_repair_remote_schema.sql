create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('binary', 'count', 'timer', 'negative')),
  category text not null check (category in ('health', 'learning', 'fitness', 'mindfulness', 'productivity', 'personal')),
  schedule jsonb not null check (jsonb_typeof(schedule) = 'object'),
  time_of_day text not null check (time_of_day in ('morning', 'afternoon', 'evening', 'anytime')),
  target_count integer check (target_count is null or target_count > 0),
  streak integer not null default 0 check (streak >= 0),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  completed_on date not null,
  count integer not null default 1 check (count > 0),
  created_at timestamptz not null default now(),
  unique (habit_id, completed_on)
);

create table if not exists public.streaks (
  habit_id uuid primary key references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  current_count integer not null default 0 check (current_count >= 0),
  best_count integer not null default 0 check (best_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mood text not null check (mood in ('great', 'okay', 'low')),
  logged_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type text not null,
  input jsonb not null,
  output jsonb,
  created_at timestamptz not null default now()
);

create index if not exists habits_user_active_time_idx on public.habits (user_id, archived_at, time_of_day, created_at desc);
create index if not exists habits_active_lookup_idx on public.habits (user_id, time_of_day, created_at desc) where archived_at is null;
create index if not exists habit_completions_user_date_idx on public.habit_completions (user_id, completed_on desc);
create index if not exists habit_completions_habit_date_idx on public.habit_completions (habit_id, completed_on desc);
create index if not exists streaks_user_idx on public.streaks (user_id);
create index if not exists mood_logs_user_date_idx on public.mood_logs (user_id, logged_on desc);
create index if not exists ai_events_user_created_idx on public.ai_events (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.streaks enable row level security;
alter table public.mood_logs enable row level security;
alter table public.ai_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles are owner scoped') then
    create policy "profiles are owner scoped" on public.profiles
      for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'habits' and policyname = 'habits are owner scoped') then
    create policy "habits are owner scoped" on public.habits
      for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'habit_completions' and policyname = 'habit completions are owner scoped') then
    create policy "habit completions are owner scoped" on public.habit_completions
      for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'streaks' and policyname = 'streaks are owner scoped') then
    create policy "streaks are owner scoped" on public.streaks
      for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mood_logs' and policyname = 'mood logs are owner scoped') then
    create policy "mood logs are owner scoped" on public.mood_logs
      for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_events' and policyname = 'ai events are owner scoped') then
    create policy "ai events are owner scoped" on public.ai_events
      for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_new_habit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.streaks (habit_id, user_id, current_count, best_count, updated_at)
  values (new.id, new.user_id, 0, 0, now())
  on conflict (habit_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_habit_created on public.habits;
create trigger on_habit_created
after insert on public.habits
for each row execute function public.handle_new_habit();
