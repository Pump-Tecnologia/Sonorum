-- 0020_pix_avulsa.sql
-- Cobrança avulsa via PIX (Escola → Aluno), custo ZERO: a escola usa a própria
-- chave PIX; o Sonorum só gera o "copia e cola"/QR (BR Code). Sem gateway, sem
-- split — o dinheiro cai direto na conta da escola. A baixa é manual.
-- Disponível em TODOS os planos (inclusive Essencial/free).

-- ── Chave PIX da escola (recebedora) ────────────────────────────────────────
alter table public.schools
  add column if not exists pix_key      text,
  add column if not exists pix_key_type text
    check (pix_key_type is null or pix_key_type in ('cpf','cnpj','email','phone','random')),
  add column if not exists pix_city     text;  -- cidade do recebedor (BR Code, máx 15)

-- ── Cobrança avulsa: charge sem matrícula, ligada direto ao aluno ────────────
-- enrollment_id deixa de ser obrigatório (cobranças avulsas não têm matrícula).
alter table public.charges
  alter column enrollment_id drop not null;

alter table public.charges
  add column if not exists student_id  uuid references public.users(id) on delete cascade,
  add column if not exists description text;  -- o que está sendo cobrado (avulsa)

-- Toda cobrança precisa de uma origem: matrícula (plano) OU aluno direto (avulsa).
alter table public.charges
  drop constraint if exists charges_origin_check;
alter table public.charges
  add constraint charges_origin_check
    check (enrollment_id is not null or student_id is not null);

create index if not exists charges_student_id_idx on public.charges(student_id);

-- Aluno enxerga também a cobrança avulsa dele (ligada por student_id, sem
-- matrícula). A policy existente só cobre cobranças via matrícula.
drop policy if exists charges_student_select_avulsa on public.charges;
create policy charges_student_select_avulsa on public.charges
  for select using (student_id = auth.uid());
