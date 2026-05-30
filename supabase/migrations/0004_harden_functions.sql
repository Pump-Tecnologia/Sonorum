-- Sonorum — Hardening dos advisors de segurança
-- Rode DEPOIS de 0003_auth_hook.sql.

-- 1. search_path fixo (evita sequestro de search_path em SECURITY DEFINER).
alter function public.set_updated_at() set search_path = '';
alter function public.custom_access_token_hook(jsonb) set search_path = '';

-- 2. Reduz a superfície: anon nunca precisa dos helpers de RLS (auth.uid() é nulo).
--    `authenticated` mantém EXECUTE pois as policies avaliam essas funções.
revoke execute on function public.current_user_role() from anon;
revoke execute on function public.current_school_id() from anon;
revoke execute on function public.is_superadmin() from anon;
revoke execute on function public.is_staff() from anon;
revoke execute on function public.is_admin() from anon;

-- handle_new_user roda como trigger (não precisa de EXECUTE para ninguém).
revoke execute on function public.handle_new_user() from anon, authenticated, public;
