-- Sonorum — matrícula, meta e cobrança só podem apontar para gente da própria escola.
--
-- As policies de equipe só conferem o school_id da linha, e o aluno enxerga a cobrança
-- por student_id ou pela matrícula. Sem esta trava, outra escola cria pela API uma
-- cobrança que aparece no portal do aluno alheio, com o Pix de quem criou. Matrículas
-- e metas têm a mesma brecha.
--
-- Só valida o que está sendo gravado ou trocado: registros antigos continuam editáveis.
-- Roda DEPOIS da RLS (after): quem é de fora é recusado pela policy, e a mensagem daqui
-- não serve para descobrir a escola de ninguém. A falha ainda desfaz a gravação.
-- Não depende do deploy do app nem da 0040; reaplicar é seguro.
--
-- Conferido em 26/11/2026: nenhuma cobrança, matrícula ou meta cruzando escolas.

begin;
set local lock_timeout = '5s';

-- Matrícula, meta e cobrança avulsa: o aluno precisa ser da escola do registro.
create or replace function public.enforce_student_school()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.school_id is not distinct from old.school_id
     and new.student_id is not distinct from old.student_id then
    return null;
  end if;

  if new.student_id is not null and not exists (
    select 1 from public.users u where u.id = new.student_id and u.school_id = new.school_id
  ) then
    raise exception 'Aluno não pertence à escola do registro.' using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

-- Cobrança de plano: a matrícula precisa ser da escola da cobrança. O aluno da matrícula
-- foi conferido quando ela foi gravada; revalidar aqui derrubaria a geração do mês
-- inteiro se um único aluno tivesse mudado de escola.
create or replace function public.enforce_charge_enrollment_school()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.school_id is not distinct from old.school_id
     and new.enrollment_id is not distinct from old.enrollment_id then
    return null;
  end if;

  if new.enrollment_id is not null and not exists (
    select 1 from public.enrollments e where e.id = new.enrollment_id and e.school_id = new.school_id
  ) then
    raise exception 'Matrícula não pertence à escola da cobrança.' using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

revoke all on function public.enforce_student_school() from public, anon, authenticated;
revoke all on function public.enforce_charge_enrollment_school() from public, anon, authenticated;

drop trigger if exists enrollments_same_school on public.enrollments;
create trigger enrollments_same_school
  after insert or update of school_id, student_id on public.enrollments
  for each row execute function public.enforce_student_school();

drop trigger if exists student_goals_same_school on public.student_goals;
create trigger student_goals_same_school
  after insert or update of school_id, student_id on public.student_goals
  for each row execute function public.enforce_student_school();

drop trigger if exists charges_student_same_school on public.charges;
create trigger charges_student_same_school
  after insert or update of school_id, student_id on public.charges
  for each row execute function public.enforce_student_school();

drop trigger if exists charges_enrollment_same_school on public.charges;
create trigger charges_enrollment_same_school
  after insert or update of school_id, enrollment_id on public.charges
  for each row execute function public.enforce_charge_enrollment_school();

commit;
