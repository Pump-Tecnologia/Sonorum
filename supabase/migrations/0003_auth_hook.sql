-- Sonorum — Sincronização auth.users → public.users + Custom Access Token Hook
-- Rode DEPOIS de 0002_rls.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: cria a linha-base do perfil quando um usuário de auth é criado.
-- NOTA: o GoTrue aplica o app_metadata custom DEPOIS do INSERT, então o trigger
-- normalmente vê role=student/school_id=null. Quem define role/school_id de fato
-- é a Server Action de criação (via service-role, logo após createUser). O trigger
-- garante que a linha exista mesmo em fluxos que não passam pela action.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role, school_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_app_meta_data ->> 'role', 'student'),
    nullif(new.raw_app_meta_data ->> 'school_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Custom Access Token Hook: injeta user_role e school_id como claims do JWT.
-- Permite ao middleware do Next.js rotear por role sem hit no banco.
-- ATIVAR no Dashboard: Authentication → Hooks → Custom Access Token →
--   selecionar public.custom_access_token_hook
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims   jsonb;
  u_role   text;
  u_school uuid;
begin
  select role, school_id into u_role, u_school
  from public.users
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(u_role, 'student')));

  if u_school is not null then
    claims := jsonb_set(claims, '{school_id}', to_jsonb(u_school));
  else
    claims := jsonb_set(claims, '{school_id}', 'null'::jsonb);
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Permissões para o role do GoTrue executar o hook e ler a tabela.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.users to supabase_auth_admin;

-- O hook roda no login; o trigger no signup. Ambos SECURITY/owner-safe.
