-- Keep expired paid schools on the free feature and quota set without deleting
-- existing data. The application also applies this rule when loading plans.

create or replace function public.enforce_student_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_type text;
  v_expiration_date date;
  v_limit integer;
  v_count integer;
  v_expired boolean;
begin
  if tg_op = 'UPDATE'
    and new.role is not distinct from old.role
    and new.school_id is not distinct from old.school_id then
    return new;
  end if;

  if new.role <> 'student' or new.school_id is null then
    return new;
  end if;

  select plan_type, expiration_date into v_plan_type, v_expiration_date
  from public.schools
  where id = new.school_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'school_not_found';
  end if;

  v_expired := v_expiration_date is not null
    and v_expiration_date < (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
  v_limit := case when v_plan_type in ('free', 'solo_free') or v_expired then 5 else null end;
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

create or replace function public.enforce_teacher_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_type text;
  v_expiration_date date;
  v_limit integer;
  v_count integer;
  v_expired boolean;
begin
  if tg_op = 'UPDATE'
    and new.user_id is not distinct from old.user_id
    and new.school_id is not distinct from old.school_id then
    return new;
  end if;

  select plan_type, expiration_date into v_plan_type, v_expiration_date
  from public.schools
  where id = new.school_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'school_not_found';
  end if;

  v_expired := v_expiration_date is not null
    and v_expiration_date < (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
  v_limit := case
    when v_plan_type in ('free', 'solo_free', 'solo', 'solo_pro') or v_expired then 1
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

revoke all on function public.enforce_student_plan_limit() from public, anon, authenticated;
revoke all on function public.enforce_teacher_plan_limit() from public, anon, authenticated;
