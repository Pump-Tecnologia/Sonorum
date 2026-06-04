-- 0016_charges_unique.sql
-- Corrige bugs funcionais da geração de cobrança encontrados em revisão:
--   1. O upsert de generateMonthlyCharges usa onConflict (enrollment_id, due_date),
--      mas não existia índice único correspondente → o upsert FALHA em runtime.
--   2. Sem unicidade de matrícula ativa por aluno, um plano por-aula poderia
--      gerar cobrança dobrada.

-- Uma cobrança por matrícula por data de vencimento (idempotência da geração).
create unique index if not exists charges_enrollment_due_date_uidx
  on public.charges (enrollment_id, due_date);

-- No máximo uma matrícula ativa por aluno (invariante do enrollStudent).
create unique index if not exists enrollments_one_active_per_student_uidx
  on public.enrollments (student_id)
  where status = 'active';
