-- Sonorum — Planos "Solo" e "Solo Pro" (professor sem escola/equipe).
--
-- Adiciona 'solo' e 'solo_pro' ao check constraint de schools.plan_type.
-- (O 'enterprise' — usado em código desde 0001_schema.sql mas ausente do
-- constraint original — já tinha sido corrigido por uma migration aplicada
-- direto no banco em 2026-06-11 (`add_enterprise_plan_and_feature_overrides`),
-- fora do histórico de arquivos locais. Mantemos ele aqui só por completude.)

alter table public.schools
  drop constraint schools_plan_type_check;

alter table public.schools
  add constraint schools_plan_type_check
  check (plan_type in ('free', 'basic', 'solo', 'solo_pro', 'professional', 'premium', 'enterprise'));
