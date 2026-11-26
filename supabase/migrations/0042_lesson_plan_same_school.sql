-- Sonorum — o planejamento precisa ser da mesma escola da aula.
--
-- A policy lesson_plans_staff só confere o school_id do próprio plano, e o aluno lê o
-- plano pela aula. Sem esta trava, outra escola cria pela API um plano numa aula alheia
-- ainda sem plano: o aluno consegue lê-lo, e a escola dona não consegue mais salvar o
-- seu (há um plano só por aula).
--
-- Só valida o que está sendo gravado ou trocado (escola e aula): planos antigos
-- continuam editáveis. Roda DEPOIS da RLS (after): quem é de fora é recusado pela
-- policy. A falha ainda desfaz a gravação. Não depende do deploy do app; reaplicar é
-- seguro.
--
-- Conferido em 26/11/2026: nenhum plano com escola diferente da aula.

begin;
set local lock_timeout = '5s';

create or replace function public.enforce_lesson_plan_school()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.school_id is not distinct from old.school_id
     and new.lesson_id is not distinct from old.lesson_id then
    return null;
  end if;

  if not exists (
    select 1 from public.lessons l where l.id = new.lesson_id and l.school_id = new.school_id
  ) then
    raise exception 'Aula não pertence à escola do planejamento.' using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

revoke all on function public.enforce_lesson_plan_school() from public, anon, authenticated;

drop trigger if exists lesson_plans_same_school on public.lesson_plans;
create trigger lesson_plans_same_school
  after insert or update of school_id, lesson_id on public.lesson_plans
  for each row execute function public.enforce_lesson_plan_school();

commit;
