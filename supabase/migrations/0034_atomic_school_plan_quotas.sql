-- Enforce plan quotas in the database so simultaneous requests cannot exceed
-- the student or teacher limit checked by the application layer.

create index if not exists users_school_role_idx
  on public.users (school_id, role);

create or replace function public.enforce_student_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_type text;
  v_limit integer;
  v_count integer;
begin
  if tg_op = 'UPDATE'
    and new.role is not distinct from old.role
    and new.school_id is not distinct from old.school_id then
    return new;
  end if;

  if new.role <> 'student' or new.school_id is null then
    return new;
  end if;

  select plan_type into v_plan_type
  from public.schools
  where id = new.school_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'school_not_found';
  end if;

  v_limit := case when v_plan_type in ('free', 'solo_free') then 5 else null end;
  if v_limit is null then
    return new;
  end if;

  select count(*) into v_count
  from public.users
  where school_id = new.school_id
    and role = 'student'
    and id <> new.id;

  if v_count >= v_limit then
    raise exception using errcode = 'P0001', message = 'student_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_student_plan_limit() from public, anon, authenticated;

drop trigger if exists users_enforce_student_plan_limit_insert on public.users;
create trigger users_enforce_student_plan_limit_insert
  before insert on public.users
  for each row execute function public.enforce_student_plan_limit();

drop trigger if exists users_enforce_student_plan_limit_update on public.users;
create trigger users_enforce_student_plan_limit_update
  before update of role, school_id on public.users
  for each row execute function public.enforce_student_plan_limit();

create or replace function public.enforce_teacher_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_type text;
  v_limit integer;
  v_count integer;
begin
  if tg_op = 'UPDATE'
    and new.user_id is not distinct from old.user_id
    and new.school_id is not distinct from old.school_id then
    return new;
  end if;

  select plan_type into v_plan_type
  from public.schools
  where id = new.school_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'school_not_found';
  end if;

  v_limit := case
    when v_plan_type in ('free', 'solo_free', 'solo', 'solo_pro') then 1
    else null
  end;
  if v_limit is null then
    return new;
  end if;

  select count(*) into v_count
  from public.teachers
  where school_id = new.school_id
    and id <> new.id;

  if v_count >= v_limit then
    raise exception using errcode = 'P0001', message = 'teacher_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_teacher_plan_limit() from public, anon, authenticated;

drop trigger if exists teachers_enforce_plan_limit_insert on public.teachers;
create trigger teachers_enforce_plan_limit_insert
  before insert on public.teachers
  for each row execute function public.enforce_teacher_plan_limit();

drop trigger if exists teachers_enforce_plan_limit_update on public.teachers;
create trigger teachers_enforce_plan_limit_update
  before update of user_id, school_id on public.teachers
  for each row execute function public.enforce_teacher_plan_limit();
