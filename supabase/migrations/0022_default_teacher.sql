-- 0022_default_teacher.sql
-- Professor fixo (opcional) do aluno: um professor padrão associado ao aluno,
-- usado como sugestão ao agendar aulas. Referencia public.users (papel teacher).
alter table public.users
  add column if not exists default_teacher_id uuid references public.users(id) on delete set null;

create index if not exists users_default_teacher_id_idx on public.users(default_teacher_id);
