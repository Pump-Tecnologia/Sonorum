-- Sonorum — Plano "Solo Essencial" (gratuito, porta de entrada do professor
-- autônomo — espelha o 'free' da escola, mas com label e identidade próprios,
-- seguindo o mesmo padrão já usado pra separar Solo/Solo Pro de
-- Profissional/Premium).

alter table public.schools
  drop constraint schools_plan_type_check;

alter table public.schools
  add constraint schools_plan_type_check
  check (plan_type in ('free', 'basic', 'solo_free', 'solo', 'solo_pro', 'professional', 'premium', 'enterprise'));
