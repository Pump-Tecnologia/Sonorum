-- Sonorum — Row Level Security
-- Substitui os middlewares Laravel: EnsureSchoolIsActive, TenantScope, role middlewares.
-- Rode DEPOIS de 0001_schema.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers (SECURITY DEFINER → ignoram RLS, evitando recursão nas policies de users)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.users where id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'superadmin' from public.users where id = auth.uid()), false);
$$;

-- staff = admin ou teacher da escola corrente
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('admin','teacher') from public.users where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Habilita RLS em todas as tabelas
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.schools                      enable row level security;
alter table public.users                        enable row level security;
alter table public.teachers                     enable row level security;
alter table public.lessons                      enable row level security;
alter table public.lesson_plans                 enable row level security;
alter table public.lesson_reports               enable row level security;
alter table public.pedagogical_resources        enable row level security;
alter table public.lesson_pedagogical_resource  enable row level security;
alter table public.materials                    enable row level security;
alter table public.student_notes                enable row level security;
alter table public.student_goals                enable row level security;
alter table public.plans                        enable row level security;
alter table public.enrollments                  enable row level security;
alter table public.charges                      enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- schools
-- ─────────────────────────────────────────────────────────────────────────────
create policy schools_superadmin on public.schools
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy schools_member_select on public.schools
  for select using (id = public.current_school_id());
create policy schools_admin_update on public.schools
  for update using (id = public.current_school_id() and public.is_admin())
  with check (id = public.current_school_id() and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────────────────────
create policy users_superadmin on public.users
  for all using (public.is_superadmin()) with check (public.is_superadmin());
-- ler o próprio registro sempre
create policy users_self_select on public.users
  for select using (id = auth.uid());
-- ler colegas da mesma escola (staff vê todos; aluno só a si mesmo já coberto acima)
create policy users_staff_select on public.users
  for select using (school_id = public.current_school_id() and public.is_staff());
-- atualizar o próprio perfil
create policy users_self_update on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());
-- admin gerencia usuários da própria escola
create policy users_admin_write on public.users
  for all using (school_id = public.current_school_id() and public.is_admin())
  with check (school_id = public.current_school_id() and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Política genérica de tenant (staff lê/escreve tudo da escola)
-- Aplicada via policies explícitas por tabela abaixo.
-- ─────────────────────────────────────────────────────────────────────────────

-- teachers
create policy teachers_superadmin on public.teachers
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy teachers_staff on public.teachers
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_admin());
create policy teachers_self_select on public.teachers
  for select using (user_id = auth.uid());

-- lessons: staff gerencia todas da escola; aluno vê as suas
create policy lessons_superadmin on public.lessons
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy lessons_staff on public.lessons
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());
create policy lessons_student_select on public.lessons
  for select using (student_id = auth.uid());

-- lesson_plans: segue a aula
create policy lesson_plans_superadmin on public.lesson_plans
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy lesson_plans_staff on public.lesson_plans
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());
create policy lesson_plans_student_select on public.lesson_plans
  for select using (exists (
    select 1 from public.lessons l
    where l.id = lesson_plans.lesson_id and l.student_id = auth.uid()
  ));

-- lesson_reports: staff gerencia; aluno vê os seus (via aula)
create policy lesson_reports_superadmin on public.lesson_reports
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy lesson_reports_staff on public.lesson_reports
  for all using (exists (
    select 1 from public.lessons l
    where l.id = lesson_reports.lesson_id and l.school_id = public.current_school_id()
  ) and public.is_staff())
  with check (exists (
    select 1 from public.lessons l
    where l.id = lesson_reports.lesson_id and l.school_id = public.current_school_id()
  ) and public.is_staff());
create policy lesson_reports_student_select on public.lesson_reports
  for select using (exists (
    select 1 from public.lessons l
    where l.id = lesson_reports.lesson_id and l.student_id = auth.uid()
  ));

-- pedagogical_resources: staff gerencia; aluno lê (biblioteca da escola)
create policy pedres_superadmin on public.pedagogical_resources
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy pedres_staff on public.pedagogical_resources
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());
create policy pedres_member_select on public.pedagogical_resources
  for select using (school_id = public.current_school_id());

-- lesson_pedagogical_resource: segue a aula
create policy lpr_superadmin on public.lesson_pedagogical_resource
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy lpr_staff on public.lesson_pedagogical_resource
  for all using (exists (
    select 1 from public.lessons l
    where l.id = lesson_pedagogical_resource.lesson_id and l.school_id = public.current_school_id()
  ) and public.is_staff())
  with check (exists (
    select 1 from public.lessons l
    where l.id = lesson_pedagogical_resource.lesson_id and l.school_id = public.current_school_id()
  ) and public.is_staff());
create policy lpr_student_select on public.lesson_pedagogical_resource
  for select using (exists (
    select 1 from public.lessons l
    where l.id = lesson_pedagogical_resource.lesson_id and l.student_id = auth.uid()
  ));

-- materials: staff gerencia; todos da escola leem
create policy materials_superadmin on public.materials
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy materials_staff on public.materials
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());
create policy materials_member_select on public.materials
  for select using (school_id = public.current_school_id());

-- student_notes: apenas staff (notas privadas sobre o aluno)
create policy student_notes_superadmin on public.student_notes
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy student_notes_staff on public.student_notes
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());

-- student_goals: staff gerencia; aluno vê e marca as suas
create policy student_goals_superadmin on public.student_goals
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy student_goals_staff on public.student_goals
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());
create policy student_goals_student_select on public.student_goals
  for select using (student_id = auth.uid());
create policy student_goals_student_update on public.student_goals
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

-- plans: staff gerencia; todos da escola leem
create policy plans_superadmin on public.plans
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy plans_staff on public.plans
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_admin());
create policy plans_member_select on public.plans
  for select using (school_id = public.current_school_id());

-- enrollments: staff gerencia; aluno vê a sua
create policy enrollments_superadmin on public.enrollments
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy enrollments_staff on public.enrollments
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());
create policy enrollments_student_select on public.enrollments
  for select using (student_id = auth.uid());

-- charges: staff gerencia; aluno vê as suas (via matrícula)
create policy charges_superadmin on public.charges
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy charges_staff on public.charges
  for all using (school_id = public.current_school_id() and public.is_staff())
  with check (school_id = public.current_school_id() and public.is_staff());
create policy charges_student_select on public.charges
  for select using (exists (
    select 1 from public.enrollments e
    where e.id = charges.enrollment_id and e.student_id = auth.uid()
  ));
