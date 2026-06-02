-- Sistema de notificações: log de envios + preferência de destinatário no aluno.
-- Templates ficam no código (decisão: fixos por ora, decidíveis no painel depois).

-- Para quem notificar este aluno: aluno, responsável, ou ambos.
alter table public.users
  add column notify_to text not null default 'both'
    check (notify_to in ('student', 'parent', 'both'));

-- Log de notificações enviadas (auditoria + retry + métricas).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  event text not null,                  -- e.g. 'charge.paid', 'lesson.tomorrow'
  recipient_user_id uuid references public.users(id) on delete set null,
  recipient_phone text,
  recipient_email text,
  channel text not null check (channel in ('email', 'whatsapp')),
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  -- 'skipped' = sem contato/canal/opt-out; 'queued' = wa.me pendente clique
  payload jsonb,                        -- contexto p/ template (amount, date, etc.)
  related_id uuid,                      -- charge.id, lesson.id… (sem FK p/ flexibilidade)
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Staff da escola lê o log; superadmin tudo.
create policy notifications_staff on public.notifications
  for select using (school_id = current_school_id() and is_staff());
create policy notifications_superadmin on public.notifications
  for all using (is_superadmin()) with check (is_superadmin());

create index notifications_school_event_idx on public.notifications (school_id, event, created_at desc);
create index notifications_recipient_idx on public.notifications (recipient_user_id, created_at desc);
