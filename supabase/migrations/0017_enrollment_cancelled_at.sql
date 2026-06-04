-- 0017_enrollment_cancelled_at.sql
-- Churn confiável: registra QUANDO a matrícula foi cancelada.
-- Antes o relatório usava updated_at (muda em qualquer edição) → impreciso.

alter table public.enrollments
  add column if not exists cancelled_at timestamptz;

-- Backfill: para canceladas existentes, usa updated_at como melhor aproximação.
update public.enrollments
set cancelled_at = updated_at
where status = 'cancelled' and cancelled_at is null;

comment on column public.enrollments.cancelled_at is 'Momento do cancelamento da matrícula (preenchido ao transitar para cancelled). Base do churn nos relatórios.';
