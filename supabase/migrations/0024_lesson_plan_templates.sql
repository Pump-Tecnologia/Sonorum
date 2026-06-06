-- Sonorum — Modelos de aula (lesson plan templates)
-- Estrutura reutilizável de planejamento por instrumento/categoria. O professor
-- aplica um modelo numa aula (pré-preenche objetivos/notas/BPM) e pode salvar o
-- plano de uma aula como modelo. Rode DEPOIS de 0001_schema.sql / 0002_rls.sql.

create table if not exists public.lesson_plan_templates (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools(id) on delete cascade,
  name                text not null,
  instrument_category text,          -- Cordas/Sopros/Teclas/Percussão/Voz/Geral (opcional)
  instrument          text,          -- instrumento específico (opcional)
  goals               text,
  warmup_note         text,
  repertoire_note     text,
  homework_note       text,
  target_bpm          text,
  created_by          uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists lesson_plan_templates_school_idx
  on public.lesson_plan_templates (school_id);
create index if not exists lesson_plan_templates_instcat_idx
  on public.lesson_plan_templates (school_id, instrument_category);

create trigger lesson_plan_templates_updated_at before update on public.lesson_plan_templates
  for each row execute function public.set_updated_at();

-- RLS: espelha pedagogical_resources (staff gerencia os modelos da própria escola).
alter table public.lesson_plan_templates enable row level security;

create policy lpt_superadmin on public.lesson_plan_templates
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy lpt_staff on public.lesson_plan_templates
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());
