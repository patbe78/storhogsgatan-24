-- Sprint 4C: make the delivery deduplication constraint explicit before using
-- it from PL/pgSQL. The catalog lookup identifies the existing unnamed UNIQUE
-- constraint by its ordered columns, without relying on PostgreSQL's truncated
-- generated name.

do $migration$
declare
  v_constraint_name name;
  v_constraint_count integer;
begin
  select count(*), min(candidate.conname::text)::name
  into v_constraint_count, v_constraint_name
  from pg_catalog.pg_constraint candidate
  join pg_catalog.pg_class delivery_table
    on delivery_table.oid = candidate.conrelid
  join pg_catalog.pg_namespace delivery_schema
    on delivery_schema.oid = delivery_table.relnamespace
  where delivery_schema.nspname = 'public'
    and delivery_table.relname = 'calendar_push_deliveries'
    and candidate.contype = 'u'
    and array(
      select attribute.attname::text
      from unnest(candidate.conkey) with ordinality as key_column(attnum, position)
      join pg_catalog.pg_attribute attribute
        on attribute.attrelid = candidate.conrelid
        and attribute.attnum = key_column.attnum
      order by key_column.position
    ) = array[
      'reminder_id',
      'occurrence_starts_at',
      'profile_id',
      'subscription_id'
    ];

  if v_constraint_count <> 1 then
    raise exception 'CALENDAR_PUSH_DELIVERY_DEDUP_CONSTRAINT_INVALID';
  end if;

  if v_constraint_name <> 'calendar_push_deliveries_dedup_key' then
    if exists (
      select 1
      from pg_catalog.pg_constraint existing
      where existing.conrelid = 'public.calendar_push_deliveries'::regclass
        and existing.conname = 'calendar_push_deliveries_dedup_key'
    ) then
      raise exception 'CALENDAR_PUSH_DELIVERY_DEDUP_CONSTRAINT_NAME_IN_USE';
    end if;

    execute format(
      'alter table public.calendar_push_deliveries rename constraint %I to calendar_push_deliveries_dedup_key',
      v_constraint_name
    );
  end if;
end;
$migration$;

create or replace function public.calendar_claim_due_push_deliveries(
  p_now timestamptz default clock_timestamp()
)
returns table (
  delivery_id uuid,
  claim_token uuid,
  endpoint text,
  p256dh text,
  auth_secret text,
  binding_id uuid,
  event_id uuid,
  occurrence_starts_at timestamptz,
  scheduled_at timestamptz,
  title text,
  all_day boolean,
  offset_minutes integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
#variable_conflict error
declare
  v_scan_start timestamptz;
begin
  select state.last_scanned_at into v_scan_start
  from public.calendar_push_dispatch_state state
  where state.singleton
  for update;
  if v_scan_start is null then v_scan_start := p_now; end if;
  if v_scan_start > p_now then v_scan_start := p_now; end if;

  insert into public.calendar_push_deliveries (
    household_id, reminder_id, event_id, profile_id, subscription_id, binding_id,
    occurrence_starts_at, scheduled_at, status
  )
  select
    due.household_id,
    due.reminder_id,
    due.event_id,
    ep.profile_id,
    sub.id,
    sub.binding_id,
    due.occurrence_starts_at,
    due.scheduled_at,
    case when due.scheduled_at < p_now - interval '10 minutes' then 'expired' else 'pending' end
  from public.calendar_due_reminder_occurrences(v_scan_start, p_now) due
  join public.calendar_event_participants ep
    on ep.event_id = due.event_id and ep.household_id = due.household_id
  join public.profiles profile
    on profile.id = ep.profile_id and profile.household_id = due.household_id
    and profile.is_active and profile.role in ('admin', 'adult', 'member')
  join public.push_subscriptions sub
    on sub.profile_id = profile.id and sub.household_id = due.household_id
    and sub.status = 'active'
  join auth.sessions session
    on session.id = sub.auth_session_id and session.user_id = sub.profile_id
  on conflict on constraint calendar_push_deliveries_dedup_key do nothing;

  update public.calendar_push_dispatch_state state
  set last_scanned_at = p_now, updated_at = p_now
  where state.singleton;

  update public.calendar_push_deliveries delivery
  set status = 'skipped', error_class = 'recipient_changed'
  where delivery.status = 'pending'
    and not exists (
      select 1
      from public.calendar_event_reminders rem
      join public.calendar_events event on event.id = rem.event_id
      join public.calendar_event_participants ep
        on ep.event_id = event.id and ep.profile_id = delivery.profile_id
      join public.profiles profile
        on profile.id = ep.profile_id and profile.is_active
        and profile.role in ('admin', 'adult', 'member')
      join public.push_subscriptions sub
        on sub.id = delivery.subscription_id
        and sub.profile_id = delivery.profile_id
        and sub.binding_id = delivery.binding_id
        and sub.status = 'active'
      join auth.sessions session
        on session.id = sub.auth_session_id and session.user_id = sub.profile_id
      where rem.id = delivery.reminder_id and event.id = delivery.event_id
    );

  update public.calendar_push_deliveries delivery
  set status = 'expired', error_class = 'catch_up_window_exceeded'
  where delivery.status in ('pending', 'processing')
    and delivery.scheduled_at < p_now - interval '10 minutes';

  return query
  with candidates as (
    select delivery.id
    from public.calendar_push_deliveries delivery
    where delivery.status = 'pending'
      and delivery.scheduled_at <= p_now
      and delivery.scheduled_at >= p_now - interval '10 minutes'
    order by delivery.scheduled_at, delivery.id
    for update skip locked
    limit 200
  ), claimed as (
    update public.calendar_push_deliveries delivery
    set status = 'processing',
        claim_token = gen_random_uuid(),
        attempted_at = p_now,
        attempt_count = delivery.attempt_count + 1
    from candidates
    where delivery.id = candidates.id
    returning delivery.*
  )
  select
    claimed.id,
    claimed.claim_token,
    sub.endpoint,
    sub.p256dh,
    sub.auth_secret,
    claimed.binding_id,
    claimed.event_id,
    claimed.occurrence_starts_at,
    claimed.scheduled_at,
    event.title,
    event.all_day,
    rem.offset_minutes
  from claimed
  join public.calendar_events event on event.id = claimed.event_id
  join public.calendar_event_reminders rem on rem.id = claimed.reminder_id
  join public.push_subscriptions sub
    on sub.id = claimed.subscription_id and sub.status = 'active'
  join public.profiles profile
    on profile.id = claimed.profile_id and profile.is_active
  join public.calendar_event_participants ep
    on ep.event_id = claimed.event_id and ep.profile_id = claimed.profile_id
  join auth.sessions session
    on session.id = sub.auth_session_id and session.user_id = sub.profile_id;
end;
$$;

revoke all on function public.calendar_claim_due_push_deliveries(timestamptz)
  from public, anon, authenticated;
grant execute on function public.calendar_claim_due_push_deliveries(timestamptz)
  to service_role;
