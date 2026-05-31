-- Sonorum — Transcrição de áudio por IA (cifra/acordes)
-- Fluxo: aluno/staff sobe áudio → IA gera rascunho de cifra → professor revisa
-- e aprova → vira um pedagogical_resource. Mantém o rascunho FORA da biblioteca
-- até a aprovação (por isso tabela própria, e não colunas em pedagogical_resources).
-- Rode DEPOIS de 0001_schema.sql / 0002_rls.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- transcription_jobs
-- ─────────────────────────────────────────────────────────────────────────────
create table public.transcription_jobs (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid references public.schools(id) on delete cascade,
  title        text not null,
  instrument   text,
  audio_path   text not null,                 -- caminho no bucket privado 'audio'
  status       text not null default 'processing'
               check (status in ('processing','pending_review','approved','rejected','failed')),
  provider     text,                          -- qual provedor gerou (mock/klangio/…)
  external_id  text,                          -- id do job no provedor (assíncrono)
  result       jsonb,                         -- saída crua do provedor (acordes + tempos)
  body         text,                          -- cifra editável pelo professor (texto)
  error        text,                          -- motivo da falha, se status = 'failed'
  resource_id  uuid references public.pedagogical_resources(id) on delete set null,
  created_by   uuid references public.users(id) on delete set null,
  reviewed_by  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index transcription_jobs_school_id_idx on public.transcription_jobs(school_id);
create index transcription_jobs_status_idx on public.transcription_jobs(status);
create trigger transcription_jobs_updated_at before update on public.transcription_jobs
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — só staff da escola mexe nos rascunhos; aluno não vê (ainda é rascunho).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.transcription_jobs enable row level security;

create policy transcription_jobs_superadmin on public.transcription_jobs
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy transcription_jobs_staff on public.transcription_jobs
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- Bucket de áudio (privado). Acesso mediado por URL assinada no servidor
-- (service role), igual ao bucket 'resources'.
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;
