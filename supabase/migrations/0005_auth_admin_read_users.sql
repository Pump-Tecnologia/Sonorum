-- Sonorum — Permite o Custom Access Token Hook ler public.users
-- Rode DEPOIS de 0004_harden_functions.sql.
--
-- O hook roda como o papel `supabase_auth_admin`. Com RLS ligado em public.users,
-- o `grant select` (em 0003) não basta — sem uma policy explícita o SELECT do hook
-- retorna 0 linhas e os claims caem no default (role=student, school_id=null).
-- Padrão recomendado pela doc do Supabase para hooks que leem tabelas com RLS.
create policy users_auth_admin_read on public.users
  as permissive
  for select
  to supabase_auth_admin
  using (true);
