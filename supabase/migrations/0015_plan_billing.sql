-- 0015_plan_billing.sql
-- Enriquece o modelo de planos de mensalidade da escola e a cobrança:
--   • plans: tipo de cobrança (mensal vs por aula), desconto de pontualidade,
--     faixa etária (descritiva) e flag de ativo.
--   • charges: snapshot do valor com desconto (estável no tempo) e o valor
--     efetivamente pago.
-- Não destrutivo: nada é removido. users.monthly_fee/due_day continuam no banco
-- (apenas saem da UI numa fase seguinte), evitando perda de dado.

-- ── plans ────────────────────────────────────────────────────────────────────
alter table public.plans
  add column if not exists billing_type text not null default 'monthly'
    check (billing_type in ('monthly', 'per_class')),
  add column if not exists early_pay_amount numeric,   -- valor com desconto de pontualidade (null = sem desconto)
  add column if not exists min_age integer,            -- faixa etária (apenas descritiva)
  add column if not exists max_age integer,
  add column if not exists active boolean not null default true;

comment on column public.plans.billing_type is 'monthly = mensalidade fixa; per_class = preço por aula realizada no mês';
comment on column public.plans.early_pay_amount is 'Valor com desconto de pontualidade. Aplicado quando a cobrança é paga até o vencimento. Null = sem desconto.';
comment on column public.plans.min_age is 'Idade mínima sugerida (descritivo, sem validação).';
comment on column public.plans.max_age is 'Idade máxima sugerida (descritivo, sem validação).';

-- ── charges ──────────────────────────────────────────────────────────────────
-- Snapshot do desconto no momento da geração (mantém a cobrança estável mesmo
-- se o plano mudar depois) + valor realmente recebido na baixa.
alter table public.charges
  add column if not exists early_pay_amount numeric,
  add column if not exists paid_amount numeric;

comment on column public.charges.early_pay_amount is 'Snapshot do valor com desconto de pontualidade no momento da geração. Null = sem desconto.';
comment on column public.charges.paid_amount is 'Valor efetivamente recebido na baixa (cheio ou com desconto, conforme a data de pagamento).';
