-- Narrow self-service UPDATE grants. RLS decides which rows can be touched;
-- column grants decide which fields authenticated clients may change.
-- Server actions that use service_role keep their administrative capabilities.

revoke update on table public.users from public, anon, authenticated;

-- School settings are changed only by the validated server action; authenticated
-- clients cannot patch plan fields or bypass input validation on branding.
revoke update on table public.schools from public, anon, authenticated;

-- Students can mark their own goals complete, but cannot rewrite the goal or
-- move it to a different school.
revoke update on table public.student_goals from public, anon, authenticated;
grant update (completed) on table public.student_goals to authenticated;
