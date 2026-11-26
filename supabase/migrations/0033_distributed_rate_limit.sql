-- Shared, atomic rate-limit buckets for server actions and route handlers.
create table if not exists public.rate_limit_counters (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  hits integer not null check (hits > 0),
  window_started_at timestamptz not null,
  expires_at timestamptz not null
);

create index if not exists rate_limit_counters_expires_at_idx
  on public.rate_limit_counters (expires_at);

alter table public.rate_limit_counters enable row level security;
revoke all on public.rate_limit_counters from public, anon, authenticated;
grant all on public.rate_limit_counters to service_role;

create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_hits integer;
  v_expires_at timestamptz;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_limit > 100000
    or p_window_ms < 1 or p_window_ms > 2592000000 then
    raise exception 'invalid rate limit parameters';
  end if;

  insert into public.rate_limit_counters as counters
    (key_hash, hits, window_started_at, expires_at)
  values
    (p_key_hash, 1, v_now, v_now + (p_window_ms * interval '1 millisecond'))
  on conflict (key_hash) do update
    set hits = case when counters.expires_at <= v_now then 1 else counters.hits + 1 end,
        window_started_at = case when counters.expires_at <= v_now then v_now else counters.window_started_at end,
        expires_at = case
          when counters.expires_at <= v_now then v_now + (p_window_ms * interval '1 millisecond')
          else counters.expires_at
        end
  returning hits, expires_at into v_hits, v_expires_at;

  -- Gradually remove stale keys without a separate scheduled job.
  delete from public.rate_limit_counters
  where key_hash in (
    select key_hash
    from public.rate_limit_counters
    where expires_at < v_now - interval '1 day'
    order by expires_at
    limit 500
  );

  return jsonb_build_object(
    'allowed', v_hits <= p_limit,
    'retry_after_sec', greatest(1, ceil(extract(epoch from (v_expires_at - v_now)))::integer)
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
