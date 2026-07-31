create table if not exists public.download_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  platform text not null check (platform in ('macos', 'windows')),
  version text not null,
  source text not null default 'website' check (source in ('website', 'direct'))
);

create index if not exists download_events_occurred_at_idx
  on public.download_events (occurred_at desc);

create index if not exists download_events_platform_idx
  on public.download_events (platform, occurred_at desc);

alter table public.download_events enable row level security;

create table if not exists public.api_request_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  route text not null,
  method text not null,
  status integer not null check (status between 100 and 599),
  duration_ms integer not null check (duration_ms >= 0),
  request_id uuid not null
);

create index if not exists api_request_events_occurred_at_idx
  on public.api_request_events (occurred_at desc);

create index if not exists api_request_events_status_idx
  on public.api_request_events (status, occurred_at desc);

alter table public.api_request_events enable row level security;

revoke all on public.download_events from public, anon, authenticated;
revoke all on public.api_request_events from public, anon, authenticated;
grant select, insert on public.download_events to service_role;
grant select, insert on public.api_request_events to service_role;
grant usage, select on sequence public.download_events_id_seq to service_role;
grant usage, select on sequence public.api_request_events_id_seq to service_role;

create or replace function public.get_naming_police_admin_metrics(p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'since', p_since,
    'downloads', jsonb_build_object(
      'total', (select count(*) from download_events where occurred_at >= p_since),
      'macos', (select count(*) from download_events where occurred_at >= p_since and platform = 'macos'),
      'windows', (select count(*) from download_events where occurred_at >= p_since and platform = 'windows')
    ),
    'api', jsonb_build_object(
      'total', (select count(*) from api_request_events where occurred_at >= p_since),
      'successful', (select count(*) from api_request_events where occurred_at >= p_since and status < 400),
      'errors', (select count(*) from api_request_events where occurred_at >= p_since and status >= 400),
      'unique_users', (select count(distinct user_id) from api_request_events where occurred_at >= p_since and user_id is not null),
      'p50_ms', coalesce((select percentile_cont(0.5) within group (order by duration_ms)::integer from api_request_events where occurred_at >= p_since), 0),
      'p95_ms', coalesce((select percentile_cont(0.95) within group (order by duration_ms)::integer from api_request_events where occurred_at >= p_since), 0)
    ),
    'usage', jsonb_build_object(
      'analyses', (select count(*) from analysis_reservations where created_at >= p_since and state = 'used'),
      'input_tokens', coalesce((select sum(input_tokens) from analysis_reservations where created_at >= p_since and state = 'used'), 0),
      'output_tokens', coalesce((select sum(output_tokens) from analysis_reservations where created_at >= p_since and state = 'used'), 0)
    ),
    'daily', coalesce((
      select jsonb_agg(row_data order by day)
      from (
        select day,
          jsonb_build_object(
            'date', day::text,
            'downloads', (select count(*) from download_events d where d.occurred_at >= day and d.occurred_at < day + interval '1 day'),
            'api_requests', (select count(*) from api_request_events a where a.occurred_at >= day and a.occurred_at < day + interval '1 day'),
            'api_errors', (select count(*) from api_request_events a where a.occurred_at >= day and a.occurred_at < day + interval '1 day' and a.status >= 400)
          ) as row_data
        from generate_series(date_trunc('day', p_since), date_trunc('day', now()), interval '1 day') day
      ) daily_rows
    ), '[]'::jsonb),
    'recent_errors', coalesce((
      select jsonb_agg(error_data order by occurred_at desc)
      from (
        select occurred_at,
          jsonb_build_object(
            'occurred_at', occurred_at,
            'route', route,
            'status', status,
            'duration_ms', duration_ms,
            'request_id', request_id
          ) as error_data
        from api_request_events
        where occurred_at >= p_since and status >= 400
        order by occurred_at desc
        limit 20
      ) recent
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_naming_police_admin_metrics(timestamptz) from public, anon, authenticated;
grant execute on function public.get_naming_police_admin_metrics(timestamptz) to service_role;
