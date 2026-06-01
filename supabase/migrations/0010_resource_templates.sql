-- Biblioteca de recursos: catálogo GLOBAL (templates) gerenciado pelo superadmin.
-- A escola recebe CÓPIAS editáveis em pedagogical_resources (template_id aponta a
-- origem; template_version guarda a versão copiada p/ futuro "atualização disponível").
create table public.resource_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  instrument_category text,
  instrument text,
  difficulty text,
  content_type text not null default 'Texto',
  body text,
  file_path text,
  content_link text,
  version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- chave natural p/ seed idempotente e evitar duplicata óbvia no catálogo
  unique (title, instrument)
);

alter table public.resource_templates enable row level security;

-- Catálogo é leitura p/ qualquer autenticado (conteúdo não sensível); só superadmin escreve.
create policy resource_templates_read on public.resource_templates
  for select using (auth.role() = 'authenticated');
create policy resource_templates_superadmin on public.resource_templates
  for all using (is_superadmin()) with check (is_superadmin());

-- Cópia da escola: liga ao template de origem + versão copiada + flag de edição.
alter table public.pedagogical_resources
  add column template_id uuid references public.resource_templates(id) on delete set null,
  add column template_version integer,
  add column customized boolean not null default false;

create index pedagogical_resources_template_id_idx on public.pedagogical_resources (template_id);
create index pedagogical_resources_school_template_idx on public.pedagogical_resources (school_id, template_id);
