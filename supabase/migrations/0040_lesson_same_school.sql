-- Sonorum — aluno e professor precisam ser da mesma escola da aula.
--
-- A policy lessons_staff só confere o school_id da própria aula. Sem esta trava, a
-- equipe de uma escola consegue criar, pela API, uma aula apontando para o aluno ou o
-- professor de outra.
--
-- Só valida o que está sendo gravado ou trocado (escola, aluno, professor). Aulas
-- antigas continuam editáveis mesmo que a pessoa tenha mudado de escola depois.
-- Seguro aplicar antes ou depois do deploy do app, e reaplicar.
--
-- Conferido em 26/11/2026: 318 aulas, nenhuma com aluno ou professor de outra escola.

begin;
set local lock_timeout = '5s';

-- security definer: quem grava a aula não precisa enxergar a linha da outra pessoa.
-- Roda DEPOIS da RLS (after): quem é de fora é recusado pela policy, e a mensagem daqui
-- não serve para descobrir a escola de ninguém. A falha ainda desfaz a gravação.
create or replace function public.enforce_lesson_school()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  check_student boolean := true;
  check_teacher boolean := true;
begin
  if tg_op = 'UPDATE' then
    check_student := new.school_id is distinct from old.school_id
      or new.student_id is distinct from old.student_id;
    check_teacher := new.school_id is distinct from old.school_id
      or new.teacher_id is distinct from old.teacher_id;
  end if;

  if check_student and not exists (
    select 1 from public.users u where u.id = new.student_id and u.school_id = new.school_id
  ) then
    raise exception 'Aluno não pertence à escola da aula.' using errcode = 'check_violation';
  end if;

  if check_teacher and new.teacher_id is not null and not exists (
    select 1 from public.users u where u.id = new.teacher_id and u.school_id = new.school_id
  ) then
    raise exception 'Professor não pertence à escola da aula.' using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

revoke all on function public.enforce_lesson_school() from public, anon, authenticated;

drop trigger if exists lessons_same_school on public.lessons;
create trigger lessons_same_school
  after insert or update of school_id, student_id, teacher_id on public.lessons
  for each row execute function public.enforce_lesson_school();

commit;
