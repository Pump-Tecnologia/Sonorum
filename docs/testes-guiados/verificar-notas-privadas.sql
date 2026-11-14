-- Somente catálogo/permissões: não lê conteúdo de notas.
-- Após 0036 + deploy compatível + 0037, todos os resultados devem ser true.
select
  to_regprocedure('public.get_lesson_private_notes(uuid)') is not null as reader_installed,
  not has_table_privilege('authenticated', 'public.lessons', 'SELECT') as no_broad_authenticated_select,
  not has_column_privilege('authenticated', 'public.lessons', 'private_notes', 'SELECT') as private_column_denied,
  not has_column_privilege('anon', 'public.lessons', 'private_notes', 'SELECT') as anon_private_column_denied,
  has_column_privilege('authenticated', 'public.lessons', 'notes', 'SELECT') as shared_notes_readable,
  has_column_privilege('authenticated', 'public.lessons', 'id', 'SELECT') as lesson_ids_readable,
  has_column_privilege('service_role', 'public.lessons', 'private_notes', 'SELECT') as backend_access_preserved;

select
  p.prosecdef as reader_security_definer,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_call_reader,
  not has_function_privilege('anon', p.oid, 'EXECUTE') as anonymous_cannot_call_reader
from pg_proc p
where p.oid = to_regprocedure('public.get_lesson_private_notes(uuid)');

-- Estes checks não substituem login real e tentativas pela API com os perfis
-- aluno/admin/professor e duas escolas com registros existentes.
