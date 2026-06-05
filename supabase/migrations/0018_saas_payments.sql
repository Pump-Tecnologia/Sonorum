-- 0018_saas_payments.sql
-- Pagamentos da assinatura do SaaS (Escola → Sonorum) via gateway (Mercado Pago).
-- Conta única do Sonorum recebe; sem split. Pagamento aprovado estende
-- schools.expiration_date.

create table if not exists public.saas_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  plan_type text not null,
  amount numeric not null,
  provider text not null default 'mercadopago',
  -- ids do gateway (preference = checkout criado; payment = pagamento em si)
  external_reference text,            -- nossa referência (school_id:plan:periodo)
  provider_preference_id text,
  provider_payment_id text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  period_start date,
  period_end date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saas_payments_school_id_idx on public.saas_payments(school_id);
create index if not exists saas_payments_payment_id_idx on public.saas_payments(provider_payment_id);

alter table public.saas_payments enable row level security;

-- Admin da escola vê os próprios pagamentos; superadmin vê tudo. Escrita só via
-- service-role (server actions / webhook), nunca pelo cliente.
create policy saas_payments_select on public.saas_payments
  for select using (
    public.is_superadmin()
    or (public.is_admin() and school_id = public.current_school_id())
  );
