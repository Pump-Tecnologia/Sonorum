-- Phase 1 (additive): install the staff-only reader without breaking the old
-- planner. Deploy the updated app, then apply 0037 to close direct column reads.
begin;

create or replace function public.get_lesson_private_notes(p_lesson_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not (public.is_staff() or public.is_superadmin()) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return (
    select l.private_notes
    from public.lessons l
    where l.id = p_lesson_id
      and (
        public.is_superadmin()
        or (public.is_staff() and l.school_id = public.current_school_id())
      )
  );
end;
$$;

revoke all on function public.get_lesson_private_notes(uuid) from public, anon;
grant execute on function public.get_lesson_private_notes(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
