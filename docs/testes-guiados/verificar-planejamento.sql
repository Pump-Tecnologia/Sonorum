-- Não lê conteúdo de aulas. Antes da migration: quatro contagens devem ser 0.
select 'plan_duplicate_groups' as check_name, count(*) as issues
from (select lesson_id from public.lesson_plans group by lesson_id having count(*)>1) d
union all
select 'report_duplicate_groups', count(*)
from (select lesson_id from public.lesson_reports group by lesson_id having count(*)>1) d
union all
select 'plan_school_mismatches', count(*)
from public.lesson_plans p join public.lessons l on l.id=p.lesson_id
where p.school_id is distinct from l.school_id
union all
select 'report_school_mismatches', count(*)
from public.lesson_reports r join public.lessons l on l.id=r.lesson_id
where r.school_id is distinct from l.school_id;

-- Após 0038: duas constraints unique válidas e uma função SECURITY INVOKER.
select conrelid::regclass as relation, conname, contype, convalidated
from pg_constraint
where (conrelid='public.lesson_plans'::regclass and conname='lesson_plans_lesson_id_key')
   or (conrelid='public.lesson_reports'::regclass and conname='lesson_reports_lesson_id_key');

select
  not p.prosecdef as respects_rls,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_call,
  not has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_cannot_call
from pg_proc p
where p.oid=to_regprocedure('public.save_lesson_plan(uuid,text,jsonb)');
