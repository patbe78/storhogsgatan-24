-- Sprint 4C: serverstyrda kalenderpåminnelser och Web Push.
-- Migrationen är avsiktligt frikopplad från Resend och exponerar inga serverhemligheter.

create table public.calendar_event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  household_id uuid not null references public.households (id) on delete cascade,
  offset_minutes integer not null check (offset_minutes >= 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, offset_minutes),
  unique (id, household_id),
  foreign key (event_id, household_id)
    references public.calendar_events (id, household_id) on delete cascade
);

create index calendar_event_reminders_household_event_idx
  on public.calendar_event_reminders (household_id, event_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  household_id uuid not null references public.households (id) on delete cascade,
  installation_id uuid not null,
  binding_id uuid not null,
  auth_session_id uuid not null,
  endpoint text not null unique check (char_length(endpoint) between 16 and 4096),
  p256dh text not null check (char_length(p256dh) between 16 and 512),
  auth_secret text not null check (char_length(auth_secret) between 8 and 512),
  status text not null default 'active' check (status in ('active', 'revoked', 'invalid')),
  browser_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(browser_metadata) = 'object'),
  invalidated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (profile_id, household_id) references public.profiles (id, household_id)
);

create unique index push_subscriptions_active_installation_key
  on public.push_subscriptions (installation_id)
  where status = 'active';
create index push_subscriptions_profile_status_idx
  on public.push_subscriptions (profile_id, status);
create index push_subscriptions_session_idx
  on public.push_subscriptions (auth_session_id)
  where status = 'active';

create table public.calendar_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  reminder_id uuid not null,
  event_id uuid not null,
  profile_id uuid not null,
  subscription_id uuid not null,
  binding_id uuid not null,
  occurrence_starts_at timestamptz not null,
  scheduled_at timestamptz not null,
  attempted_at timestamptz null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'invalid_subscription', 'skipped', 'expired')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  error_class text null check (char_length(error_class) <= 120),
  sent_at timestamptz null,
  claim_token uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reminder_id, occurrence_starts_at, profile_id, subscription_id)
);

create index calendar_push_deliveries_claim_idx
  on public.calendar_push_deliveries (status, scheduled_at);
create index calendar_push_deliveries_subscription_idx
  on public.calendar_push_deliveries (subscription_id, created_at desc);

create table public.calendar_push_dispatch_state (
  singleton boolean primary key default true check (singleton),
  last_scanned_at timestamptz not null,
  updated_at timestamptz not null default now()
);

insert into public.calendar_push_dispatch_state (singleton, last_scanned_at)
values (true, clock_timestamp())
on conflict (singleton) do nothing;

create trigger calendar_event_reminders_updated_at
before update on public.calendar_event_reminders
for each row execute function public.set_calendar_updated_at();
create trigger push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_calendar_updated_at();
create trigger calendar_push_deliveries_updated_at
before update on public.calendar_push_deliveries
for each row execute function public.set_calendar_updated_at();

alter table public.calendar_event_reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.calendar_push_deliveries enable row level security;
alter table public.calendar_push_dispatch_state enable row level security;

create policy "Calendar roles can read reminders"
on public.calendar_event_reminders for select to authenticated
using (
  household_id = (select public.current_household_id())
  and (select public.current_calendar_role()) in ('admin', 'adult', 'member')
);

create policy "Users can read own push subscriptions"
on public.push_subscriptions for select to authenticated
using (profile_id = (select auth.uid()));

grant select on public.calendar_event_reminders to authenticated;
grant select (
  id, profile_id, household_id, installation_id, binding_id, status,
  invalidated_at, created_at, updated_at
) on public.push_subscriptions to authenticated;
revoke insert, update, delete on public.calendar_event_reminders, public.push_subscriptions
  from authenticated, anon;
revoke all on public.calendar_push_deliveries, public.calendar_push_dispatch_state
  from public, anon, authenticated;

-- Bevara befintliga single/custom-reminders innan den normaliserade modellen blir auktoritativ.
insert into public.calendar_event_reminders (
  event_id, household_id, offset_minutes, created_by, created_at, updated_at
)
select
  e.id,
  e.household_id,
  case e.reminder_type
    when 'at_start' then 0
    when '5_minutes' then 5
    when '15_minutes' then 15
    when '30_minutes' then 30
    when '1_hour' then 60
    when '1_day' then 1440
    when 'custom' then e.reminder_offset_minutes
    else null
  end,
  e.created_by,
  e.created_at,
  e.updated_at
from public.calendar_events e
where e.reminder_type <> 'none'
  and (e.reminder_type <> 'custom' or e.reminder_offset_minutes is not null)
on conflict (event_id, offset_minutes) do nothing;

create or replace function public.calendar_events_in_range(
  p_range_start timestamptz,
  p_range_end timestamptz
)
returns setof jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', e.id, 'household_id', e.household_id, 'title', e.title, 'description', e.description,
    'location', e.location, 'notes', e.notes, 'category_id', e.category_id, 'category_name', c.name,
    'category_color', c.color, 'created_by', e.created_by, 'updated_by', e.updated_by,
    'starts_at', e.starts_at, 'ends_at', e.ends_at, 'all_day', e.all_day,
    'all_day_start', e.all_day_start, 'all_day_end', e.all_day_end, 'is_family_event', e.is_family_event,
    'reminder_offsets_minutes', coalesce((
      select jsonb_agg(rem.offset_minutes order by rem.offset_minutes)
      from public.calendar_event_reminders rem where rem.event_id = e.id
    ), '[]'::jsonb),
    'reminder_type', e.reminder_type, 'reminder_offset_minutes', e.reminder_offset_minutes,
    'external_source', e.external_source, 'external_id', e.external_id,
    'recurrence_series_id', e.recurrence_series_id, 'created_at', e.created_at, 'updated_at', e.updated_at,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'color', p.color) order by p.name)
      from public.calendar_event_participants ep
      join public.profiles p on p.id = ep.profile_id
      where ep.event_id = e.id
    ), '[]'::jsonb),
    'recurrence', case when r.id is null then null else jsonb_build_object(
      'id', r.id, 'frequency', r.frequency, 'interval_value', r.interval_value,
      'starts_on', r.starts_on, 'ends_on', r.ends_on, 'occurrence_count', r.occurrence_count,
      'parent_series_id', r.parent_series_id, 'split_from_date', r.split_from_date
    ) end
  )
  from public.calendar_events e
  left join public.calendar_categories c on c.id = e.category_id
  left join public.calendar_recurrence_series r on r.id = e.recurrence_series_id
  where e.household_id = (select public.current_household_id())
    and (
      (e.recurrence_series_id is null and (
        (not e.all_day and e.starts_at < p_range_end and e.ends_at > p_range_start)
        or (e.all_day
          and e.all_day_start <= (p_range_end at time zone 'Europe/Stockholm')::date
          and e.all_day_end >= (p_range_start at time zone 'Europe/Stockholm')::date)
      ))
      or (
        e.recurrence_series_id is not null
        and r.starts_on <= (p_range_end at time zone 'Europe/Stockholm')::date
        and (r.ends_on is null or r.ends_on >= (p_range_start at time zone 'Europe/Stockholm')::date)
      )
    );
$$;

create or replace function public.calendar_parse_reminder_offsets(p_payload jsonb)
returns integer[]
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_offsets integer[] := '{}'::integer[];
  v_total integer;
  v_distinct integer;
  v_type text;
begin
  if p_payload ? 'reminderOffsetsMinutes' then
    if jsonb_typeof(p_payload->'reminderOffsetsMinutes') <> 'array' then
      raise exception 'CALENDAR_VALIDATION_REMINDERS' using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_payload->'reminderOffsetsMinutes') value
      where jsonb_typeof(value) <> 'number' or value::text !~ '^[0-9]+$'
    ) then
      raise exception 'CALENDAR_VALIDATION_REMINDERS' using errcode = '22023';
    end if;
    select coalesce(array_agg((value #>> '{}')::integer order by (value #>> '{}')::integer), '{}'::integer[]),
           count(*), count(distinct (value #>> '{}')::integer)
    into v_offsets, v_total, v_distinct
    from jsonb_array_elements(p_payload->'reminderOffsetsMinutes') value;
    if v_total <> v_distinct then
      raise exception 'CALENDAR_VALIDATION_DUPLICATE_REMINDER' using errcode = '22023';
    end if;
    return v_offsets;
  end if;

  v_type := coalesce(p_payload->>'reminderType', 'none');
  return case v_type
    when 'none' then '{}'::integer[]
    when 'at_start' then array[0]
    when '5_minutes' then array[5]
    when '15_minutes' then array[15]
    when '30_minutes' then array[30]
    when '1_hour' then array[60]
    when '1_day' then array[1440]
    when 'custom' then array[(p_payload->>'reminderOffsetMinutes')::integer]
    else null
  end;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'CALENDAR_VALIDATION_REMINDERS' using errcode = '22023';
end;
$$;

create or replace function public.calendar_save_event(p_event_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_role text;
  v_active boolean;
  v_event public.calendar_events%rowtype;
  v_event_id uuid := coalesce(p_event_id, gen_random_uuid());
  v_series_id uuid;
  v_participants uuid[];
  v_reminders integer[];
  v_family boolean := coalesce((p_payload->>'isFamilyEvent')::boolean, false);
  v_category uuid := nullif(p_payload->>'categoryId', '')::uuid;
  v_all_day boolean := coalesce((p_payload->>'allDay')::boolean, false);
  v_recurrence jsonb := p_payload->'recurrence';
begin
  select household_id, role, is_active into v_household, v_role, v_active
  from public.profiles where id = v_uid;
  if v_household is null or not coalesce(v_active, false)
     or v_role not in ('admin', 'adult', 'member') then
    raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_payload->>'title', ''))) not between 1 and 150
     or char_length(trim(coalesce(p_payload->>'description', ''))) > 2000 then
    raise exception 'CALENDAR_VALIDATION' using errcode = '22023';
  end if;
  if v_family and v_role not in ('admin', 'adult') then
    raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501';
  end if;

  v_reminders := public.calendar_parse_reminder_offsets(p_payload);
  if v_reminders is null
     or exists (select 1 from unnest(v_reminders) value where value is null or value < 0) then
    raise exception 'CALENDAR_VALIDATION_REMINDERS' using errcode = '22023';
  end if;

  if p_event_id is not null then
    select * into v_event from public.calendar_events
    where id = p_event_id and household_id = v_household for update;
    if not found or (v_role <> 'admin' and v_event.created_by <> v_uid) then
      raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501';
    end if;
    v_series_id := v_event.recurrence_series_id;
  end if;

  if v_category is not null
     and not (p_event_id is not null and v_event.category_id = v_category)
     and not exists (
       select 1 from public.calendar_categories
       where id = v_category and household_id = v_household and not is_archived
     ) then
    raise exception 'CALENDAR_VALIDATION_ARCHIVED_CATEGORY' using errcode = '22023';
  end if;

  if v_family then
    select array_agg(id order by id) into v_participants
    from public.profiles
    where household_id = v_household and is_active and role in ('admin', 'adult', 'member');
  else
    select array_agg(value::uuid) into v_participants
    from jsonb_array_elements_text(coalesce(p_payload->'participantIds', '[]'::jsonb));
  end if;
  if coalesce(array_length(v_participants, 1), 0) = 0 then
    raise exception 'CALENDAR_VALIDATION_PARTICIPANTS' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_participants) id
    where not exists (
      select 1 from public.profiles p
      where p.id = id and p.household_id = v_household and p.is_active
        and p.role in ('admin', 'adult', 'member')
    )
  ) then
    raise exception 'CALENDAR_FORBIDDEN_PARTICIPANT' using errcode = '42501';
  end if;
  if v_role = 'member' and not (v_uid = any(v_participants)) then
    raise exception 'CALENDAR_FORBIDDEN_MEMBER_SELF_REQUIRED' using errcode = '42501';
  end if;

  if v_recurrence is not null and jsonb_typeof(v_recurrence) <> 'null' then
    if coalesce((v_recurrence->>'intervalValue')::integer, 0) <= 0
       or (nullif(v_recurrence->>'endsOn', '') is not null
           and v_recurrence->>'occurrenceCount' is not null) then
      raise exception 'CALENDAR_VALIDATION_RECURRENCE' using errcode = '22023';
    end if;
    if v_series_id is null then
      v_series_id := gen_random_uuid();
      insert into public.calendar_recurrence_series (
        id, household_id, frequency, interval_value, starts_on, ends_on,
        occurrence_count, created_by, updated_by
      ) values (
        v_series_id, v_household, v_recurrence->>'frequency',
        (v_recurrence->>'intervalValue')::integer,
        coalesce(
          nullif(p_payload->>'allDayStart', '')::date,
          ((p_payload->>'startsAt')::timestamptz at time zone 'Europe/Stockholm')::date
        ),
        nullif(v_recurrence->>'endsOn', '')::date,
        nullif(v_recurrence->>'occurrenceCount', '')::integer,
        v_uid, v_uid
      );
    else
      update public.calendar_recurrence_series
      set frequency = v_recurrence->>'frequency',
          interval_value = (v_recurrence->>'intervalValue')::integer,
          ends_on = nullif(v_recurrence->>'endsOn', '')::date,
          occurrence_count = nullif(v_recurrence->>'occurrenceCount', '')::integer,
          updated_by = v_uid
      where id = v_series_id and household_id = v_household;
    end if;
  end if;

  if p_event_id is null then
    insert into public.calendar_events (
      id, household_id, title, description, location, notes, category_id,
      created_by, updated_by, starts_at, ends_at, all_day, all_day_start,
      all_day_end, is_family_event, reminder_type, reminder_offset_minutes,
      external_source, external_id, recurrence_series_id
    ) values (
      v_event_id, v_household, trim(p_payload->>'title'),
      coalesce(trim(p_payload->>'description'), ''), nullif(trim(p_payload->>'location'), ''),
      nullif(trim(p_payload->>'notes'), ''), v_category, v_uid, v_uid,
      case when v_all_day then null else (p_payload->>'startsAt')::timestamptz end,
      case when v_all_day then null else (p_payload->>'endsAt')::timestamptz end,
      v_all_day,
      case when v_all_day then (p_payload->>'allDayStart')::date else null end,
      case when v_all_day then (p_payload->>'allDayEnd')::date else null end,
      v_family, 'none', null, nullif(p_payload->>'externalSource', ''),
      nullif(p_payload->>'externalId', ''), v_series_id
    );
  else
    update public.calendar_events
    set title = trim(p_payload->>'title'),
        description = coalesce(trim(p_payload->>'description'), ''),
        location = nullif(trim(p_payload->>'location'), ''),
        notes = nullif(trim(p_payload->>'notes'), ''),
        category_id = v_category,
        updated_by = v_uid,
        starts_at = case when v_all_day then null else (p_payload->>'startsAt')::timestamptz end,
        ends_at = case when v_all_day then null else (p_payload->>'endsAt')::timestamptz end,
        all_day = v_all_day,
        all_day_start = case when v_all_day then (p_payload->>'allDayStart')::date else null end,
        all_day_end = case when v_all_day then (p_payload->>'allDayEnd')::date else null end,
        is_family_event = v_family,
        reminder_type = 'none',
        reminder_offset_minutes = null,
        external_source = nullif(p_payload->>'externalSource', ''),
        external_id = nullif(p_payload->>'externalId', ''),
        recurrence_series_id = v_series_id
    where id = v_event_id;
    delete from public.calendar_event_participants where event_id = v_event_id;
  end if;

  insert into public.calendar_event_participants (event_id, profile_id, household_id)
  select v_event_id, id, v_household from unnest(v_participants) id;

  delete from public.calendar_event_reminders where event_id = v_event_id;
  insert into public.calendar_event_reminders (
    event_id, household_id, offset_minutes, created_by
  )
  select v_event_id, v_household, value, v_uid from unnest(v_reminders) value;

  return v_event_id;
end;
$$;

create or replace function public.push_register_subscription(
  p_installation_id uuid,
  p_binding_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth_secret text,
  p_browser_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_role text;
  v_active boolean;
  v_session uuid;
  v_id uuid;
begin
  select household_id, role, is_active into v_household, v_role, v_active
  from public.profiles where id = v_uid;
  v_session := nullif(auth.jwt()->>'session_id', '')::uuid;
  if v_uid is null or v_household is null or not coalesce(v_active, false)
     or v_role not in ('admin', 'adult', 'member')
     or v_session is null
     or not exists (
       select 1 from auth.sessions s where s.id = v_session and s.user_id = v_uid
     ) then
    raise exception 'PUSH_FORBIDDEN' using errcode = '42501';
  end if;
  if p_installation_id is null or p_binding_id is null
     or char_length(coalesce(p_endpoint, '')) not between 16 and 4096
     or p_endpoint !~ '^https://'
     or char_length(coalesce(p_p256dh, '')) not between 16 and 512
     or char_length(coalesce(p_auth_secret, '')) not between 8 and 512
     or coalesce(jsonb_typeof(p_browser_metadata), '') <> 'object'
     or octet_length(p_browser_metadata::text) > 4096 then
    raise exception 'PUSH_VALIDATION' using errcode = '22023';
  end if;

  perform 1 from public.push_subscriptions
  where endpoint = p_endpoint or installation_id = p_installation_id
  for update;

  update public.push_subscriptions
  set status = 'revoked', invalidated_at = coalesce(invalidated_at, clock_timestamp())
  where installation_id = p_installation_id
    and endpoint <> p_endpoint
    and status = 'active';

  insert into public.push_subscriptions (
    profile_id, household_id, installation_id, binding_id, auth_session_id,
    endpoint, p256dh, auth_secret, status, browser_metadata, invalidated_at
  ) values (
    v_uid, v_household, p_installation_id, p_binding_id, v_session,
    p_endpoint, p_p256dh, p_auth_secret, 'active', p_browser_metadata, null
  )
  on conflict (endpoint) do update
  set profile_id = excluded.profile_id,
      household_id = excluded.household_id,
      installation_id = excluded.installation_id,
      binding_id = excluded.binding_id,
      auth_session_id = excluded.auth_session_id,
      p256dh = excluded.p256dh,
      auth_secret = excluded.auth_secret,
      status = 'active',
      browser_metadata = excluded.browser_metadata,
      invalidated_at = null
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.push_deactivate_installation(p_installation_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.push_subscriptions
  set status = 'revoked', invalidated_at = clock_timestamp()
  where installation_id = p_installation_id
    and profile_id = auth.uid()
    and status = 'active';
end;
$$;

create or replace function public.calendar_recurrence_date(
  p_start date,
  p_frequency text,
  p_interval integer,
  p_occurrence_index integer
)
returns date
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_cursor date := p_start;
  v_step integer;
  v_month_index integer;
  v_year integer;
  v_month integer;
  v_day integer;
  v_last_day integer;
begin
  if p_occurrence_index < 0 or p_interval <= 0 then return null; end if;
  if p_frequency = 'daily' then
    return p_start + (p_interval * p_occurrence_index);
  elsif p_frequency = 'weekly' then
    return p_start + (7 * p_interval * p_occurrence_index);
  elsif p_frequency not in ('monthly', 'yearly') then
    return null;
  end if;

  -- date-fns addMonths/addYears appliceras sekventiellt i frontend. Det innebär
  -- exempelvis 31 jan -> 28 feb -> 28 mar, inte 31 mar.
  if p_occurrence_index = 0 then return v_cursor; end if;
  for v_step in 1..p_occurrence_index loop
    if p_frequency = 'monthly' then
      v_month_index := extract(year from v_cursor)::integer * 12
        + extract(month from v_cursor)::integer - 1 + p_interval;
      v_year := v_month_index / 12;
      v_month := mod(v_month_index, 12) + 1;
    else
      v_year := extract(year from v_cursor)::integer + p_interval;
      v_month := extract(month from v_cursor)::integer;
    end if;
    v_last_day := extract(day from (
      make_date(v_year, v_month, 1) + interval '1 month - 1 day'
    ))::integer;
    v_day := least(extract(day from v_cursor)::integer, v_last_day);
    v_cursor := make_date(v_year, v_month, v_day);
  end loop;
  return v_cursor;
end;
$$;

create or replace function public.calendar_due_reminder_occurrences(
  p_scan_start timestamptz,
  p_scan_end timestamptz
)
returns table (
  reminder_id uuid,
  event_id uuid,
  household_id uuid,
  occurrence_starts_at timestamptz,
  scheduled_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v record;
  v_index integer;
  v_date date;
  v_occurrence_start timestamptz;
  v_scheduled timestamptz;
  v_time time;
begin
  for v in
    select
      rem.id as reminder_id,
      rem.offset_minutes,
      e.id as event_id,
      e.household_id,
      e.all_day,
      e.starts_at,
      e.all_day_start,
      e.recurrence_series_id,
      r.frequency,
      r.interval_value,
      r.starts_on,
      r.ends_on,
      r.occurrence_count
    from public.calendar_event_reminders rem
    join public.calendar_events e on e.id = rem.event_id and e.household_id = rem.household_id
    left join public.calendar_recurrence_series r on r.id = e.recurrence_series_id
  loop
    v_time := case when v.all_day then time '00:00:00'
      else (v.starts_at at time zone 'Europe/Stockholm')::time end;
    if v.recurrence_series_id is null then
      v_date := case when v.all_day then v.all_day_start
        else (v.starts_at at time zone 'Europe/Stockholm')::date end;
      v_occurrence_start := (v_date::timestamp + v_time) at time zone 'Europe/Stockholm';
      v_scheduled := v_occurrence_start - make_interval(mins => v.offset_minutes);
      if v_scheduled > p_scan_start and v_scheduled <= p_scan_end then
        reminder_id := v.reminder_id;
        event_id := v.event_id;
        household_id := v.household_id;
        occurrence_starts_at := v_occurrence_start;
        scheduled_at := v_scheduled;
        return next;
      end if;
      continue;
    end if;

    v_date := v.starts_on;
    for v_index in 0..4999 loop
      exit when v.occurrence_count is not null and v_index >= v.occurrence_count;
      if v_index > 0 then
        v_date := public.calendar_recurrence_date(
          v_date, v.frequency, v.interval_value, 1
        );
      end if;
      exit when v_date is null or (v.ends_on is not null and v_date > v.ends_on);
      v_occurrence_start := (v_date::timestamp + v_time) at time zone 'Europe/Stockholm';
      v_scheduled := v_occurrence_start - make_interval(mins => v.offset_minutes);
      exit when v_scheduled > p_scan_end;
      if v_scheduled > p_scan_start and v_scheduled <= p_scan_end then
        reminder_id := v.reminder_id;
        event_id := v.event_id;
        household_id := v.household_id;
        occurrence_starts_at := v_occurrence_start;
        scheduled_at := v_scheduled;
        return next;
      end if;
    end loop;
  end loop;
end;
$$;

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
declare
  v_scan_start timestamptz;
begin
  select last_scanned_at into v_scan_start
  from public.calendar_push_dispatch_state
  where singleton
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
  on conflict (reminder_id, occurrence_starts_at, profile_id, subscription_id) do nothing;

  update public.calendar_push_dispatch_state
  set last_scanned_at = p_now, updated_at = p_now
  where singleton;

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

  update public.calendar_push_deliveries
  set status = 'expired', error_class = 'catch_up_window_exceeded'
  where status in ('pending', 'processing')
    and scheduled_at < p_now - interval '10 minutes';

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

create or replace function public.calendar_confirm_push_delivery(
  p_delivery_id uuid,
  p_claim_token uuid
)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.calendar_push_deliveries delivery
    join public.calendar_event_reminders rem on rem.id = delivery.reminder_id
    join public.calendar_events event on event.id = delivery.event_id
    join public.calendar_event_participants ep
      on ep.event_id = delivery.event_id and ep.profile_id = delivery.profile_id
    join public.profiles profile
      on profile.id = delivery.profile_id and profile.is_active
      and profile.role in ('admin', 'adult', 'member')
    join public.push_subscriptions sub
      on sub.id = delivery.subscription_id and sub.profile_id = delivery.profile_id
      and sub.binding_id = delivery.binding_id and sub.status = 'active'
    join auth.sessions session
      on session.id = sub.auth_session_id and session.user_id = sub.profile_id
    where delivery.id = p_delivery_id
      and delivery.claim_token = p_claim_token
      and delivery.status = 'processing'
      and rem.event_id = event.id
  );
$$;

create or replace function public.calendar_complete_push_delivery(
  p_delivery_id uuid,
  p_claim_token uuid,
  p_status text,
  p_error_class text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_subscription uuid;
begin
  if p_status not in ('sent', 'failed', 'invalid_subscription', 'skipped') then
    raise exception 'PUSH_DELIVERY_STATUS_INVALID' using errcode = '22023';
  end if;
  update public.calendar_push_deliveries
  set status = p_status,
      error_class = left(nullif(p_error_class, ''), 120),
      sent_at = case when p_status = 'sent' then clock_timestamp() else null end
  where id = p_delivery_id
    and claim_token = p_claim_token
    and status = 'processing'
  returning subscription_id into v_subscription;

  if p_status = 'invalid_subscription' and v_subscription is not null then
    update public.push_subscriptions
    set status = 'invalid', invalidated_at = clock_timestamp()
    where id = v_subscription;
  end if;
end;
$$;

revoke all on function public.calendar_parse_reminder_offsets(jsonb)
  from public, anon, authenticated;
revoke all on function public.calendar_recurrence_date(date, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.calendar_due_reminder_occurrences(timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.calendar_claim_due_push_deliveries(timestamptz)
  from public, anon, authenticated;
revoke all on function public.calendar_confirm_push_delivery(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.calendar_complete_push_delivery(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.calendar_claim_due_push_deliveries(timestamptz) to service_role;
grant execute on function public.calendar_confirm_push_delivery(uuid, uuid) to service_role;
grant execute on function public.calendar_complete_push_delivery(uuid, uuid, text, text) to service_role;

revoke all on function public.push_register_subscription(uuid, uuid, text, text, text, jsonb)
  from public, anon;
revoke all on function public.push_deactivate_installation(uuid)
  from public, anon;
grant execute on function public.push_register_subscription(uuid, uuid, text, text, text, jsonb)
  to authenticated;
grant execute on function public.push_deactivate_installation(uuid)
  to authenticated;

comment on column public.push_subscriptions.auth_session_id is
  'Supabase Auth session_id. Dispatch kräver motsvarande auth.sessions-rad; kolumnen exponeras aldrig av någon server-RPC.';
comment on table public.calendar_push_deliveries is
  'Server-only leveransjournal. Reminder-/event-ID:n bevaras som audit snapshots även efter källradens radering.';
