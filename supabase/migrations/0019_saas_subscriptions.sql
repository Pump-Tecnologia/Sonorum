-- 0019_saas_subscriptions.sql
-- Assinatura recorrente da escola (cartão cobrando sozinho via Mercado Pago
-- preapproval). Cada cobrança mensal vira uma linha em saas_payments.

create table if not exists public.saas_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_subscription_id text,         -- preapproval id do MP
  plan_type text not null,
  amount numeric not null,
  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'paused', 'cancelled')),
  next_charge_at date,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saas_subscriptions_school_id_idx on public.saas_subscriptions(school_id);
create index if not exists saas_subscriptions_provider_id_idx on public.saas_subscriptions(provider_subscription_id);
-- No máximo uma assinatura ativa por escola.
create unique index if not exists saas_subscriptions_one_active_uidx
  on public.saas_subscriptions(school_id) where status = 'authorized';

-- Liga a cobrança individual à assinatura que a originou.
alter table public.saas_payments
  add column if not exists subscription_id uuid references public.saas_subscriptions(id) on delete set null;

alter table public.saas_subscriptions enable row level security;

create policy saas_subscriptions_select on public.saas_subscriptions
  for select using (
    public.is_superadmin()
    or (public.is_admin() and school_id = public.current_school_id())
  );
