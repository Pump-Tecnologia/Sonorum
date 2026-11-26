-- Sonorum — Trilha de auditoria de impersonação (item A3 da auditoria de segurança).
--
-- Quem impersonou quem, quando e em qual escola. Escrita SOMENTE via
-- service-role (server action de impersonação); nenhum papel tem INSERT/UPDATE/
-- DELETE via API. Sem FK para users de propósito: o evento sobrevive à exclusão
-- do usuário (trilha de auditoria não pode ser apagada em cascata).

create table public.impersonation_events (
  id                 uuid primary key default gen_random_uuid(),
  action             text not null check (action in ('start', 'stop')),
  impersonator_id    uuid not null,
  impersonator_role  text not null,
  target_id          uuid not null,
  target_role        text not null,
  school_id          uuid,
  created_at         timestamptz not null default now()
);

create index impersonation_events_impersonator_idx
  on public.impersonation_events (impersonator_id, created_at desc);
create index impersonation_events_target_idx
  on public.impersonation_events (target_id, created_at desc);

alter table public.impersonation_events enable row level security;

-- Leitura: somente superadmin. Nenhuma policy de escrita = nenhuma escrita via
-- anon/authenticated (o service-role ignora RLS e é o único caminho de escrita).
create policy impersonation_events_superadmin_read on public.impersonation_events
  for select using (public.is_superadmin());
