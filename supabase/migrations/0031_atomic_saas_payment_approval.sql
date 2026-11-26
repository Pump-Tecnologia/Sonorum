-- Apply a paid SaaS checkout exactly once, atomically with the school entitlement.
create or replace function public.approve_saas_payment(
  p_payment_id uuid,
  p_provider_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.saas_payments%rowtype;
  v_expiration date;
  v_base date;
begin
  select * into v_payment
  from public.saas_payments
  where id = p_payment_id
  for update;

  if not found then
    return jsonb_build_object('handled', false, 'status', 'not_found');
  end if;

  if exists (
    select 1 from public.saas_payments
    where provider_payment_id = p_provider_payment_id and id <> p_payment_id
  ) then
    return jsonb_build_object('handled', false, 'status', 'payment_id_conflict');
  end if;

  if v_payment.status = 'approved' then
    return jsonb_build_object('handled', true, 'status', 'approved', 'school_id', v_payment.school_id);
  end if;

  if v_payment.status not in ('pending', 'rejected', 'cancelled') then
    return jsonb_build_object('handled', false, 'status', v_payment.status, 'school_id', v_payment.school_id);
  end if;

  select expiration_date into v_expiration
  from public.schools
  where id = v_payment.school_id
  for update;

  if not found then
    return jsonb_build_object('handled', false, 'status', 'school_not_found');
  end if;

  v_base := greatest(coalesce(v_expiration, current_date), current_date);

  update public.saas_payments
  set status = 'approved',
      provider_payment_id = p_provider_payment_id,
      paid_at = now(),
      updated_at = now()
  where id = p_payment_id;

  update public.schools
  set plan_type = v_payment.plan_type,
      expiration_date = (v_base + interval '1 month')::date,
      updated_at = now()
  where id = v_payment.school_id;

  return jsonb_build_object('handled', true, 'status', 'approved', 'school_id', v_payment.school_id);
end;
$$;

revoke all on function public.approve_saas_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_saas_payment(uuid, text) to service_role;

-- Replace an active enrollment only after validating both records in the
-- current tenant. Locking the student row serializes simultaneous requests.
create or replace function public.replace_active_enrollment(
  p_student_id uuid,
  p_plan_id uuid,
  p_due_day integer,
  p_custom_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_school_id uuid := public.current_school_id();
begin
  if not public.is_admin() or v_school_id is null then
    return jsonb_build_object('ok', false, 'reason', 'access_denied');
  end if;

  if p_due_day < 1 or p_due_day > 31 or p_custom_amount < 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;

  perform 1 from public.users
  where id = p_student_id and school_id = v_school_id and role = 'student'
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'student_not_found');
  end if;

  perform 1 from public.plans
  where id = p_plan_id and school_id = v_school_id and active = true
  for share;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'plan_not_found');
  end if;

  update public.enrollments
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where school_id = v_school_id and student_id = p_student_id and status = 'active';

  insert into public.enrollments (school_id, student_id, plan_id, due_day, custom_amount, status)
  values (v_school_id, p_student_id, p_plan_id, p_due_day, p_custom_amount, 'active');

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.replace_active_enrollment(uuid, uuid, integer, numeric) from public, anon;
grant execute on function public.replace_active_enrollment(uuid, uuid, integer, numeric) to authenticated;
