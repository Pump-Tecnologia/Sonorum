-- Phase 2: apply AFTER deploying the planner that uses get_lesson_private_notes.
-- Existing notes stay in place. RLS still protects rows; column privileges
-- prevent students from reading the staff-only field directly or through *.
begin;

-- Fail without changing grants if the preparation migration is missing.
do $$
begin
  if to_regprocedure('public.get_lesson_private_notes(uuid)') is null then
    raise exception 'Apply 0036_private_lesson_notes.sql before activating grants.';
  end if;
end;
$$;

revoke select on table public.lessons from public, anon, authenticated;
revoke select (private_notes) on public.lessons from public, anon, authenticated;

-- Enumerate current columns so future sensitive columns are not exposed by a
-- table-wide SELECT grant. Do not change INSERT/UPDATE/DELETE or service_role.
do $$
declare
  readable_columns text;
begin
  select string_agg(format('%I', a.attname), ', ' order by a.attnum)
  into readable_columns
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.lessons'::regclass
    and a.attnum > 0 and not a.attisdropped
    and a.attname <> 'private_notes';

  execute format('grant select (%s) on public.lessons to authenticated', readable_columns);
end;
$$;

notify pgrst, 'reload schema';
commit;
