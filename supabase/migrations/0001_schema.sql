-- Sonorum — Schema consolidado (Laravel → Supabase)
-- Projeto novo em sa-east-1. PKs em uuid; public.users espelha auth.users.
-- Rode este arquivo PRIMEIRO, depois 0002_rls.sql e 0003_auth_hook.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensões
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: updated_at automático
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- schools (tenant raiz)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.schools (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  custom_name     text,
  logo_path       text,
  brand_primary   text,
  brand_secondary text,
  slug            text not null unique,
  cnpj            text,
  active_plan     text not null default 'free',
  expiration_date date,
  monthly_price   numeric(10,2) not null default 0,
  plan_type       text not null default 'free' check (plan_type in ('free','basic','professional','premium')),
  student_limit   integer not null default 5,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger schools_updated_at before update on public.schools
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- users (perfil público; id == auth.users.id)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  school_id           uuid references public.schools(id) on delete set null,
  name                text not null,
  email               text not null,
  avatar_path         text,
  phone               text,
  parent_contact      text,
  address             text,
  monthly_fee         numeric(10,2),
  due_day             integer,
  role                text not null default 'student' check (role in ('superadmin','admin','teacher','student')),
  instrument_category text,
  instrument          jsonb,
  status              text not null default 'active' check (status in ('active','paused','inactive')),
  permanent_notes     text,
  objectives          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index users_school_id_idx on public.users(school_id);
create index users_role_idx on public.users(role);
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- teachers (perfil de professor)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.teachers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  school_id   uuid not null references public.schools(id) on delete cascade,
  instruments jsonb,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index teachers_school_id_idx on public.teachers(school_id);
create index teachers_user_id_idx on public.teachers(user_id);
create trigger teachers_updated_at before update on public.teachers
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- lessons (agenda de aulas)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.lessons (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid references public.schools(id) on delete cascade,
  student_id     uuid not null references public.users(id) on delete cascade,
  teacher_id     uuid references public.users(id) on delete set null,
  title          text not null,
  start_datetime timestamptz not null,
  end_datetime   timestamptz not null,
  status         text not null default 'scheduled' check (status in ('scheduled','completed','canceled')),
  notes          text,
  goals          text,
  private_notes  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index lessons_school_id_idx on public.lessons(school_id);
create index lessons_student_id_idx on public.lessons(student_id);
create index lessons_teacher_id_idx on public.lessons(teacher_id);
create index lessons_start_idx on public.lessons(start_datetime);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- lesson_plans (planejamento da aula)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.lesson_plans (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references public.schools(id) on delete cascade,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  warmup        text,
  repertoire    text,
  homework      text,
  target_bpm    text,
  notes         text,
  specific_data jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index lesson_plans_school_id_idx on public.lesson_plans(school_id);
create index lesson_plans_lesson_id_idx on public.lesson_plans(lesson_id);
create trigger lesson_plans_updated_at before update on public.lesson_plans
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- lesson_reports (relatório de desempenho da aula)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.lesson_reports (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid references public.schools(id) on delete cascade,
  lesson_id        uuid not null references public.lessons(id) on delete cascade,
  technique_score  smallint not null default 0,
  theory_score     smallint not null default 0,
  repertoire_score smallint not null default 0,
  practice_score   smallint not null default 0,
  current_song     text,
  initial_bpm      integer,
  reached_bpm      integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index lesson_reports_lesson_id_idx on public.lesson_reports(lesson_id);
create trigger lesson_reports_updated_at before update on public.lesson_reports
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- pedagogical_resources (biblioteca pedagógica)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.pedagogical_resources (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid references public.schools(id) on delete cascade,
  title               text not null,
  description         text,
  category            text not null,
  instrument_category text,
  instrument          text,
  difficulty          text not null default 'Iniciante' check (difficulty in ('Iniciante','Intermediário','Avançado')),
  content_type        text not null default 'Texto' check (content_type in ('Texto','PDF','Link Vídeo','Cifra/Tablatura')),
  body                text,
  file_path           text,
  content_link        text,
  created_by          uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index pedagogical_resources_school_id_idx on public.pedagogical_resources(school_id);
create trigger pedagogical_resources_updated_at before update on public.pedagogical_resources
  for each row execute function public.set_updated_at();

-- pivô aula ↔ recurso pedagógico
create table public.lesson_pedagogical_resource (
  id                      uuid primary key default gen_random_uuid(),
  lesson_id               uuid not null references public.lessons(id) on delete cascade,
  pedagogical_resource_id uuid not null references public.pedagogical_resources(id) on delete cascade,
  section                 text not null default 'general',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index lpr_lesson_id_idx on public.lesson_pedagogical_resource(lesson_id);
create index lpr_resource_id_idx on public.lesson_pedagogical_resource(pedagogical_resource_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- materials (materiais didáticos / arquivos R2)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.materials (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid references public.schools(id) on delete cascade,
  title       text not null,
  description text,
  file_path   text not null,
  file_type   text not null,
  instrument  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index materials_school_id_idx on public.materials(school_id);
create trigger materials_updated_at before update on public.materials
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- student_notes (notas do professor sobre o aluno)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.student_notes (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid references public.schools(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  content    text not null,
  date       date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index student_notes_user_id_idx on public.student_notes(user_id);
create index student_notes_school_id_idx on public.student_notes(school_id);
create trigger student_notes_updated_at before update on public.student_notes
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- student_goals (metas do aluno)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.student_goals (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid references public.schools(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  text       text not null,
  completed  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index student_goals_student_id_idx on public.student_goals(student_id);
create index student_goals_school_id_idx on public.student_goals(school_id);
create trigger student_goals_updated_at before update on public.student_goals
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- plans (planos de mensalidade da escola)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  name        text not null,
  description text,
  amount      numeric(10,2) not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index plans_school_id_idx on public.plans(school_id);
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- enrollments (matrícula aluno ↔ plano)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.enrollments (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references public.schools(id) on delete cascade,
  student_id    uuid not null references public.users(id) on delete cascade,
  plan_id       uuid not null references public.plans(id) on delete cascade,
  due_day       integer not null,
  custom_amount numeric(10,2),
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index enrollments_school_id_idx on public.enrollments(school_id);
create index enrollments_student_id_idx on public.enrollments(student_id);
create trigger enrollments_updated_at before update on public.enrollments
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- charges (cobranças geradas pela matrícula)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.charges (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid references public.schools(id) on delete cascade,
  enrollment_id  uuid not null references public.enrollments(id) on delete cascade,
  amount         numeric(10,2) not null,
  due_date       date not null,
  status         text not null default 'pending' check (status in ('pending','paid','overdue','cancelled')),
  paid_at        timestamptz,
  payment_method text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index charges_school_id_idx on public.charges(school_id);
create index charges_enrollment_id_idx on public.charges(enrollment_id);
create index charges_status_idx on public.charges(status);
create trigger charges_updated_at before update on public.charges
  for each row execute function public.set_updated_at();

-- NOTA: a tabela legacy `payments` foi intencionalmente omitida.
-- O modelo financeiro vigente é Enrollment → Charge (ver SONORUM_MIGRATION.md).
