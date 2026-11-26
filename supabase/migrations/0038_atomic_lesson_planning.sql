-- Safe to apply before deploying the new app. Existing upserts gain their
-- required uniqueness; the updated app uses the atomic planning function.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
lock table public.lessons, public.lesson_plans, public.lesson_reports in share row exclusive mode;

-- Never choose/delete a historical duplicate or silently move it across schools.
do $$
begin
  if exists (select lesson_id from public.lesson_plans group by lesson_id having count(*) > 1)
     or exists (select lesson_id from public.lesson_reports group by lesson_id having count(*) > 1) then
    raise exception 'Duplicate lesson plans/reports: review existing records before applying 0038.';
  end if;
  if exists (
    select 1 from public.lesson_plans p join public.lessons l on l.id = p.lesson_id
    where p.school_id is distinct from l.school_id
  ) or exists (
    select 1 from public.lesson_reports r join public.lessons l on l.id = r.lesson_id
    where r.school_id is distinct from l.school_id
  ) then
    raise exception 'Inconsistent school on lesson plans/reports: review before applying 0038.';
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.lesson_plans'::regclass and conname = 'lesson_plans_lesson_id_key') then
    alter table public.lesson_plans add constraint lesson_plans_lesson_id_key unique (lesson_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.lesson_reports'::regclass and conname = 'lesson_reports_lesson_id_key') then
    alter table public.lesson_reports add constraint lesson_reports_lesson_id_key unique (lesson_id);
  end if;
end;
$$;

create or replace function public.save_lesson_plan(p_lesson_id uuid, p_goals text, p_plan jsonb)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_school uuid;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if p_plan is null or jsonb_typeof(p_plan) <> 'object' then
    raise exception 'Planejamento inválido.' using errcode = '22023';
  end if;

  -- The school comes from the authenticated lesson, never from client JSON.
  -- Row lock also serializes concurrent saves of the same lesson.
  select l.school_id into target_school
  from public.lessons l
  where l.id = p_lesson_id and l.school_id = public.current_school_id()
  for update;
  if not found then
    raise exception 'Aula não encontrada.' using errcode = '42501';
  end if;

  update public.lessons set goals = p_goals
  where id = p_lesson_id and school_id = target_school;

  insert into public.lesson_plans as existing (
    lesson_id, school_id, warmup, repertoire, homework, target_bpm, notes, specific_data
  ) values (
    p_lesson_id, target_school, p_plan->>'warmup', p_plan->>'repertoire',
    p_plan->>'homework', p_plan->>'target_bpm', p_plan->>'notes',
    nullif(p_plan->'specific_data', 'null'::jsonb)
  )
  on conflict (lesson_id) do update set
    warmup = excluded.warmup, repertoire = excluded.repertoire,
    homework = excluded.homework, target_bpm = excluded.target_bpm,
    notes = case when p_plan ? 'notes' then excluded.notes else existing.notes end,
    specific_data = excluded.specific_data;

  return true;
end;
$$;

revoke all on function public.save_lesson_plan(uuid, text, jsonb) from public, anon;
grant execute on function public.save_lesson_plan(uuid, text, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
