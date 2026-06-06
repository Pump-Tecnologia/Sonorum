-- 0023_google_calendar.sql
-- Integração com Google Calendar (OAuth push, mão única). ESTRUTURA INERTE:
-- só funciona quando as envs GOOGLE_CLIENT_ID/SECRET existirem e o app estiver
-- verificado. Cada professor/aluno conecta a própria conta; uma aula vira evento
-- na agenda de CADA participante conectado (mapeamento por participante).

-- Conexão OAuth por usuário (refresh token cifrado — nunca em texto puro).
create table if not exists public.google_calendar_connections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  school_id         uuid references public.schools(id) on delete cascade,
  provider          text not null default 'google',
  google_email      text,
  calendar_id       text not null default 'primary',
  refresh_token_enc text not null,
  scope             text,
  connected_at      timestamptz not null default now(),
  revoked_at        timestamptz,
  updated_at        timestamptz not null default now(),
  unique (user_id, provider)
);
create index if not exists gcal_connections_user_idx on public.google_calendar_connections(user_id);
create trigger google_calendar_connections_updated_at before update on public.google_calendar_connections
  for each row execute function public.set_updated_at();

alter table public.google_calendar_connections enable row level security;
-- O usuário vê a própria conexão; escrita só via service-role (callback OAuth).
create policy gcal_connections_select_own on public.google_calendar_connections
  for select using (user_id = auth.uid());

-- Mapeia (aula, participante) → evento criado na agenda dele.
create table if not exists public.lesson_calendar_events (
  id                uuid primary key default gen_random_uuid(),
  lesson_id         uuid not null references public.lessons(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  provider          text not null default 'google',
  external_event_id text not null,
  created_at        timestamptz not null default now(),
  unique (lesson_id, user_id, provider)
);
create index if not exists lesson_calendar_events_lesson_idx on public.lesson_calendar_events(lesson_id);
create index if not exists lesson_calendar_events_user_idx on public.lesson_calendar_events(user_id);

alter table public.lesson_calendar_events enable row level security;
create policy lesson_calendar_events_select_own on public.lesson_calendar_events
  for select using (user_id = auth.uid());
