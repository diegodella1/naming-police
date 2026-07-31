create extension if not exists pgcrypto;

create table if not exists public.analysis_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  period date not null,
  state text not null check (state in ('reserved', 'used', 'released')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (user_id, request_id)
);

create index if not exists analysis_reservations_user_period_state_idx
  on public.analysis_reservations (user_id, period, state);

alter table public.analysis_reservations enable row level security;

create policy "users can read own usage"
  on public.analysis_reservations for select
  using (auth.uid() = user_id);

create or replace function public.get_analysis_usage(
  p_user_id uuid,
  p_monthly_limit integer
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with current_period as (
    select date_trunc('month', now())::date as starts,
           (date_trunc('month', now()) + interval '1 month')::date as resets
  ),
  totals as (
    select
      count(*) filter (where state = 'used')::integer as used,
      count(*) filter (where state = 'reserved')::integer as reserved
    from analysis_reservations, current_period
    where user_id = p_user_id and period = current_period.starts
  )
  select jsonb_build_object(
    'period', current_period.starts::text,
    'used', coalesce(totals.used, 0),
    'reserved', coalesce(totals.reserved, 0),
    'limit', p_monthly_limit,
    'resets_at', current_period.resets::text
  )
  from current_period cross join totals;
$$;

create or replace function public.reserve_analysis_quota(
  p_user_id uuid,
  p_request_id text,
  p_monthly_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', now())::date;
  v_id uuid;
  v_count integer;
  v_snapshot jsonb;
begin
  if length(p_request_id) < 8 then
    raise exception 'invalid_request_id';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text || v_period::text));

  select id into v_id
  from analysis_reservations
  where user_id = p_user_id and request_id = p_request_id;

  if v_id is null then
    select count(*) into v_count
    from analysis_reservations
    where user_id = p_user_id and period = v_period and state in ('reserved', 'used');
    if v_count >= p_monthly_limit then
      raise exception 'quota_exceeded';
    end if;
    insert into analysis_reservations (user_id, request_id, period, state)
    values (p_user_id, p_request_id, v_period, 'reserved')
    returning id into v_id;
  end if;

  v_snapshot := get_analysis_usage(p_user_id, p_monthly_limit);
  return jsonb_build_object('reservation_id', v_id, 'snapshot', v_snapshot);
end;
$$;

create or replace function public.finalize_analysis_quota(
  p_reservation_id uuid,
  p_success boolean,
  p_input_tokens integer,
  p_output_tokens integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update analysis_reservations
  set state = case when p_success then 'used' else 'released' end,
      input_tokens = case when p_success then greatest(p_input_tokens, 0) else 0 end,
      output_tokens = case when p_success then greatest(p_output_tokens, 0) else 0 end,
      finalized_at = now()
  where id = p_reservation_id and state = 'reserved';
$$;

revoke all on function public.reserve_analysis_quota(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.finalize_analysis_quota(uuid, boolean, integer, integer) from public, anon, authenticated;
revoke all on function public.get_analysis_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_analysis_usage(uuid, integer) to service_role;
grant execute on function public.reserve_analysis_quota(uuid, text, integer) to service_role;
grant execute on function public.finalize_analysis_quota(uuid, boolean, integer, integer) to service_role;
