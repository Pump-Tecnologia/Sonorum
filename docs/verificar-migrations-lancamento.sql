-- Verificação somente leitura das migrations críticas de lançamento.
-- Execute no SQL Editor do projeto Supabase de destino.

with checks as (
  select
    '0031 approve_saas_payment existe' as item,
    to_regprocedure('public.approve_saas_payment(uuid,text)') is not null as ok
  union all
  select
    '0031 replace_active_enrollment existe',
    to_regprocedure('public.replace_active_enrollment(uuid,uuid,integer,numeric)') is not null
  union all
  select
    '0031 approve_saas_payment executável por service_role',
    coalesce(has_function_privilege('service_role', to_regprocedure('public.approve_saas_payment(uuid,text)'), 'EXECUTE'), false)
  union all
  select
    '0031 replace_active_enrollment executável por authenticated',
    coalesce(has_function_privilege('authenticated', to_regprocedure('public.replace_active_enrollment(uuid,uuid,integer,numeric)'), 'EXECUTE'), false)
  union all
  select
    '0032 authenticated sem UPDATE amplo em users',
    not coalesce(has_table_privilege('authenticated', 'public.users', 'UPDATE'), false)
  union all
  select
    '0032 authenticated sem UPDATE amplo em schools',
    not coalesce(has_table_privilege('authenticated', 'public.schools', 'UPDATE'), false)
  union all
  select
    '0032 authenticated sem UPDATE amplo em student_goals',
    not coalesce(has_table_privilege('authenticated', 'public.student_goals', 'UPDATE'), false)
  union all
  select
    '0032 authenticated pode atualizar student_goals.completed',
    coalesce(has_column_privilege('authenticated', 'public.student_goals', 'completed', 'UPDATE'), false)
  union all
  select
    '0032 authenticated nao pode atualizar student_goals.text',
    not coalesce(has_column_privilege('authenticated', 'public.student_goals', 'text', 'UPDATE'), false)
  union all
  select
    '0003 custom_access_token_hook existe',
    to_regprocedure('public.custom_access_token_hook(jsonb)') is not null
  union all
  select
    '0003 supabase_auth_admin pode executar o hook',
    coalesce(has_function_privilege('supabase_auth_admin', to_regprocedure('public.custom_access_token_hook(jsonb)'), 'EXECUTE'), false)
  union all
  select
    '0003 supabase_auth_admin pode ler public.users',
    coalesce(has_table_privilege('supabase_auth_admin', 'public.users', 'SELECT'), false)
  union all
  select
    '0003 supabase_auth_admin tem USAGE em public',
    coalesce(has_schema_privilege('supabase_auth_admin', 'public', 'USAGE'), false)
  union all
  select
    '0033 RPC de rate limit existe',
    to_regprocedure('public.consume_rate_limit(text,integer,integer)') is not null
  union all
  select
    '0035 função de cota de alunos contém regra de vencimento',
    coalesce(position('v_expired' in pg_get_functiondef(to_regprocedure('public.enforce_student_plan_limit()'))) > 0, false)
  union all
  select
    '0035 função de cota de professores contém regra de vencimento',
    coalesce(position('v_expired' in pg_get_functiondef(to_regprocedure('public.enforce_teacher_plan_limit()'))) > 0, false)
  union all
  select
    '0034/0035 trigger de limite de alunos ativo',
    (
      select count(*) = 2 from pg_trigger
      where tgname in ('users_enforce_student_plan_limit_insert', 'users_enforce_student_plan_limit_update')
        and not tgisinternal
        and tgrelid = 'public.users'::regclass
    )
  union all
  select
    '0034/0035 trigger de limite de professores ativo',
    (
      select count(*) = 2 from pg_trigger
      where tgname in ('teachers_enforce_plan_limit_insert', 'teachers_enforce_plan_limit_update')
        and not tgisinternal
        and tgrelid = 'public.teachers'::regclass
    )
)
select item, ok
from checks
order by item;
