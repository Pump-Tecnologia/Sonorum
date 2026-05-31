-- Salas da escola + vínculo da aula a uma sala.
-- (Estado final: a coluna capacity chegou a existir e foi removida na mesma
--  fase, então esta migration já cria rooms sem capacity.)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

-- RLS espelhando plans: membros da escola leem; admin escreve; superadmin tudo.
create policy rooms_member_select on public.rooms
  for select using (school_id = current_school_id());

create policy rooms_staff on public.rooms
  for all
  using (school_id = current_school_id() and is_staff())
  with check (school_id = current_school_id() and is_admin());

create policy rooms_superadmin on public.rooms
  for all using (is_superadmin()) with check (is_superadmin());

-- Aula aponta a sala; apagar a sala não apaga a aula.
alter table public.lessons add column if not exists room_id uuid references public.rooms(id) on delete set null;
create index if not exists lessons_room_id_idx on public.lessons (room_id);
