-- O aluno só enxerga a própria linha em public.users (users_self_select), então o nome do
-- professor das suas aulas vinha vazio. Esta função devolve apenas o id da aula e o nome
-- do professor, e só das aulas do próprio aluno. Não abre a tabela users.
create or replace function public.student_lesson_teachers()
returns table (lesson_id uuid, teacher_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, u.name
  from public.lessons l
  join public.users u on u.id = l.teacher_id
  where l.student_id = (select auth.uid())
$$;

revoke all on function public.student_lesson_teachers() from public, anon;
grant execute on function public.student_lesson_teachers() to authenticated;
