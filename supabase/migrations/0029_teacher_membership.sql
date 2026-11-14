-- Sonorum — public.teachers como fonte única de "quem dá aula".
--
-- Até aqui, `users.role='teacher'` era usado como atalho pra decidir quem
-- aparece como professor (agenda, lançamento de aula, dashboard etc.), mesmo
-- a tabela public.teachers já modelando exatamente esse vínculo (pessoa↔papel
-- de professor numa escola). Isso impedia um admin de também dar aula — caso
-- do plano Solo, onde o dono da conta é ao mesmo tempo quem administra e quem
-- ensina.
--
-- Esta migration só garante a integridade do lado do banco (1 vínculo de
-- professor por pessoa); a troca das consultas de `role='teacher'` para
-- `public.teachers` acontece no código da aplicação.
--
-- Verificado antes de aplicar: 0 usuários role='teacher' sem linha em
-- teachers, 0 linhas em teachers sem usuário role='teacher' correspondente,
-- 0 user_id duplicado — dado limpo, sem necessidade de backfill.

alter table public.teachers
  add constraint teachers_user_id_key unique (user_id);
