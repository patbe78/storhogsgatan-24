-- Release 0.9.1: one weekly recurrence series can target several ISO weekdays.
-- NULL deliberately preserves the original anchor-day recurrence semantics.

create or replace function public.calendar_valid_weekdays(p_weekdays smallint[])
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select p_weekdays is null or (
    cardinality(p_weekdays) between 1 and 7
    and p_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    and cardinality(p_weekdays) = (
      select count(distinct weekday) from unnest(p_weekdays) weekday
    )
  );
$$;

revoke all on function public.calendar_valid_weekdays(smallint[]) from public, anon, authenticated;

alter table public.calendar_recurrence_series
  add column weekdays smallint[] null;

alter table public.calendar_recurrence_series
  add constraint calendar_recurrence_series_weekdays_check
  check (
    public.calendar_valid_weekdays(weekdays)
    and (weekdays is null or frequency = 'weekly')
  );

create or replace function public.calendar_parse_recurrence_weekdays(p_recurrence jsonb)
returns smallint[]
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_weekdays smallint[];
  v_total integer;
begin
  if not (p_recurrence ? 'weekdays') or jsonb_typeof(p_recurrence->'weekdays') = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_recurrence->'weekdays') <> 'array'
     or p_recurrence->>'frequency' <> 'weekly' then
    raise exception 'CALENDAR_VALIDATION_RECURRENCE_WEEKDAYS' using errcode = '22023';
  end if;

  v_total := jsonb_array_length(p_recurrence->'weekdays');
  select array_agg(value::smallint order by value::smallint)
  into v_weekdays
  from jsonb_array_elements_text(p_recurrence->'weekdays');

  if v_total = 0
     or not public.calendar_valid_weekdays(v_weekdays)
     or cardinality(v_weekdays) <> v_total then
    raise exception 'CALENDAR_VALIDATION_RECURRENCE_WEEKDAYS' using errcode = '22023';
  end if;
  return v_weekdays;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'CALENDAR_VALIDATION_RECURRENCE_WEEKDAYS' using errcode = '22023';
end;
$$;

revoke all on function public.calendar_parse_recurrence_weekdays(jsonb)
  from public, anon, authenticated;

-- Returns the zero-based occurrence date. The four-argument overload remains
-- the authoritative legacy path when weekdays is NULL.
create or replace function public.calendar_recurrence_date(
  p_start date,
  p_frequency text,
  p_interval integer,
  p_weekdays smallint[],
  p_occurrence_index integer
)
returns date
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_start_week date;
  v_selected smallint[];
  v_week_block integer;
  v_position integer;
  v_weekday smallint;
  v_candidate date;
  v_remaining integer := p_occurrence_index;
begin
  if p_occurrence_index < 0 or p_interval <= 0 then return null; end if;
  if p_weekdays is null then
    return public.calendar_recurrence_date(
      p_start, p_frequency, p_interval, p_occurrence_index
    );
  end if;
  if p_frequency <> 'weekly' or not public.calendar_valid_weekdays(p_weekdays) then
    return null;
  end if;

  v_start_week := p_start - (extract(isodow from p_start)::integer - 1);
  select array_agg(weekday order by weekday) into v_selected
  from unnest(p_weekdays) weekday;
  foreach v_weekday in array v_selected loop
    v_candidate := v_start_week + (v_weekday - 1);
    if v_candidate >= p_start then
      if v_remaining = 0 then return v_candidate; end if;
      v_remaining := v_remaining - 1;
    end if;
  end loop;

  v_week_block := (v_remaining / cardinality(v_selected)) + 1;
  v_position := mod(v_remaining, cardinality(v_selected)) + 1;
  return v_start_week
    + (v_week_block * p_interval * 7)
    + (v_selected[v_position] - 1);
end;
$$;

revoke all on function public.calendar_recurrence_date(date, text, integer, smallint[], integer)
  from public, anon, authenticated;

create or replace function public.calendar_events_in_range(
  p_range_start timestamptz,
  p_range_end timestamptz
)
returns setof jsonb
language sql
stable
security definer
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
      join public.profiles p on p.id = ep.profile_id and p.household_id = e.household_id
      where ep.event_id = e.id and ep.household_id = e.household_id
    ), '[]'::jsonb),
    'recurrence', case when r.id is null then null else jsonb_build_object(
      'id', r.id, 'frequency', r.frequency, 'interval_value', r.interval_value,
      'starts_on', r.starts_on, 'ends_on', r.ends_on, 'occurrence_count', r.occurrence_count,
      'weekdays', r.weekdays,
      'parent_series_id', r.parent_series_id, 'split_from_date', r.split_from_date
    ) end
  )
  from public.calendar_events e
  left join public.calendar_categories c on c.id = e.category_id and c.household_id = e.household_id
  left join public.calendar_recurrence_series r
    on r.id = e.recurrence_series_id and r.household_id = e.household_id
  where e.household_id = (select public.current_household_id())
    and (select public.current_calendar_role()) in ('admin', 'adult', 'member')
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

revoke all on function public.calendar_events_in_range(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.calendar_events_in_range(timestamptz, timestamptz)
  to authenticated;

create or replace function public.calendar_validate_series_occurrence(
  p_series_id uuid,
  p_occurrence_date date,
  p_expected_prior_occurrences integer default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_series public.calendar_recurrence_series%rowtype;
  v_cursor date;
  v_index integer := 0;
  v_day_delta bigint;
  v_day_step bigint;
begin
  if p_occurrence_date is null then
    raise exception 'CALENDAR_VALIDATION_OCCURRENCE_DATE_REQUIRED' using errcode = '22023';
  end if;

  select * into v_series
  from public.calendar_recurrence_series
  where id = p_series_id
  for update;
  if not found then
    raise exception 'CALENDAR_VALIDATION_SERIES' using errcode = '22023';
  end if;
  if p_occurrence_date < v_series.starts_on then
    raise exception 'CALENDAR_VALIDATION_OCCURRENCE_BEFORE_START' using errcode = '22023';
  end if;
  if v_series.ends_on is not null and p_occurrence_date > v_series.ends_on then
    raise exception 'CALENDAR_VALIDATION_OCCURRENCE_AFTER_END' using errcode = '22023';
  end if;

  if v_series.weekdays is not null then
    loop
      v_cursor := public.calendar_recurrence_date(
        v_series.starts_on,
        v_series.frequency,
        v_series.interval_value,
        v_series.weekdays,
        v_index
      );
      if v_cursor is null or v_cursor > p_occurrence_date then
        raise exception 'CALENDAR_VALIDATION_NOT_AN_OCCURRENCE' using errcode = '22023';
      end if;
      exit when v_cursor = p_occurrence_date;
      v_index := v_index + 1;
      if v_index >= 10000 then
        raise exception 'CALENDAR_VALIDATION_OCCURRENCE_LIMIT' using errcode = '22023';
      end if;
    end loop;
  elsif v_series.frequency in ('daily', 'weekly') then
    v_day_delta := p_occurrence_date - v_series.starts_on;
    v_day_step := v_series.interval_value::bigint
      * case when v_series.frequency = 'weekly' then 7 else 1 end;
    if mod(v_day_delta, v_day_step) <> 0 then
      raise exception 'CALENDAR_VALIDATION_NOT_AN_OCCURRENCE' using errcode = '22023';
    end if;
    v_index := (v_day_delta / v_day_step)::integer;
  else
    v_cursor := v_series.starts_on;
    loop
      exit when v_cursor = p_occurrence_date;
      if v_cursor > p_occurrence_date then
        raise exception 'CALENDAR_VALIDATION_NOT_AN_OCCURRENCE' using errcode = '22023';
      end if;
      if v_index >= 10000 then
        raise exception 'CALENDAR_VALIDATION_OCCURRENCE_LIMIT' using errcode = '22023';
      end if;
      v_cursor := case v_series.frequency
        when 'monthly' then (v_cursor + make_interval(months => v_series.interval_value))::date
        when 'yearly' then (v_cursor + make_interval(years => v_series.interval_value))::date
        else null
      end;
      if v_cursor is null then
        raise exception 'CALENDAR_VALIDATION_RECURRENCE_FREQUENCY' using errcode = '22023';
      end if;
      v_index := v_index + 1;
    end loop;
  end if;

  if v_series.occurrence_count is not null and v_index >= v_series.occurrence_count then
    raise exception 'CALENDAR_VALIDATION_OCCURRENCE_AFTER_COUNT' using errcode = '22023';
  end if;
  if p_expected_prior_occurrences is not null
     and p_expected_prior_occurrences <> v_index then
    raise exception 'CALENDAR_VALIDATION_PRIOR_OCCURRENCE_COUNT' using errcode = '22023';
  end if;
  return v_index;
end;
$$;

revoke all on function public.calendar_validate_series_occurrence(uuid, date, integer)
  from public, anon, authenticated;

create or replace function public.calendar_split_series(
  p_event_id uuid,
  p_occurrence_date date,
  p_prior_occurrences integer,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_original public.calendar_events%rowtype;
  v_old_series public.calendar_recurrence_series%rowtype;
  v_new_event uuid;
  v_new_series uuid;
  v_remaining integer;
  v_parent uuid;
  v_verified_prior integer;
begin
  select * into v_original
  from public.calendar_events
  where id = p_event_id and household_id = public.current_household_id()
  for update;
  if not found or v_original.recurrence_series_id is null then
    raise exception 'CALENDAR_VALIDATION_SERIES' using errcode = '22023';
  end if;
  if public.current_calendar_role() <> 'admin' and v_original.created_by <> auth.uid() then
    raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501';
  end if;
  if p_prior_occurrences is null then
    raise exception 'CALENDAR_VALIDATION_PRIOR_OCCURRENCE_COUNT' using errcode = '22023';
  end if;

  v_verified_prior := public.calendar_validate_series_occurrence(
    v_original.recurrence_series_id, p_occurrence_date, p_prior_occurrences
  );
  select * into v_old_series
  from public.calendar_recurrence_series
  where id = v_original.recurrence_series_id
  for update;
  v_parent := v_old_series.id;
  v_remaining := case when v_old_series.occurrence_count is null then null
    else v_old_series.occurrence_count - v_verified_prior end;

  if v_verified_prior = 0 then
    delete from public.calendar_events where id = p_event_id;
    delete from public.calendar_recurrence_series where id = v_old_series.id;
    v_parent := null;
  elsif v_old_series.occurrence_count is not null then
    update public.calendar_recurrence_series
    set ends_on = null, occurrence_count = v_verified_prior, updated_by = auth.uid()
    where id = v_old_series.id;
  else
    update public.calendar_recurrence_series
    set ends_on = p_occurrence_date - 1, occurrence_count = null, updated_by = auth.uid()
    where id = v_old_series.id;
  end if;

  v_new_event := public.calendar_save_event(null, p_payload - 'id');
  select recurrence_series_id into v_new_series
  from public.calendar_events where id = v_new_event;
  if v_new_series is null then
    insert into public.calendar_recurrence_series (
      household_id, frequency, interval_value, starts_on, ends_on,
      occurrence_count, weekdays, parent_series_id, split_from_date,
      created_by, updated_by
    ) values (
      v_old_series.household_id, v_old_series.frequency, v_old_series.interval_value,
      p_occurrence_date, v_old_series.ends_on, v_remaining, v_old_series.weekdays,
      v_parent, p_occurrence_date, auth.uid(), auth.uid()
    ) returning id into v_new_series;
    update public.calendar_events set recurrence_series_id = v_new_series where id = v_new_event;
  else
    update public.calendar_recurrence_series
    set parent_series_id = v_parent, split_from_date = p_occurrence_date
    where id = v_new_series;
  end if;
  return v_new_event;
end;
$$;

revoke all on function public.calendar_split_series(uuid, date, integer, jsonb)
  from public, anon;
grant execute on function public.calendar_split_series(uuid, date, integer, jsonb)
  to authenticated;

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
  v_weekdays smallint[];
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
    v_weekdays := public.calendar_parse_recurrence_weekdays(v_recurrence);
    if v_series_id is null then
      v_series_id := gen_random_uuid();
      insert into public.calendar_recurrence_series (
        id, household_id, frequency, interval_value, starts_on, ends_on,
        occurrence_count, weekdays, created_by, updated_by
      ) values (
        v_series_id, v_household, v_recurrence->>'frequency',
        (v_recurrence->>'intervalValue')::integer,
        coalesce(
          nullif(p_payload->>'allDayStart', '')::date,
          ((p_payload->>'startsAt')::timestamptz at time zone 'Europe/Stockholm')::date
        ),
        nullif(v_recurrence->>'endsOn', '')::date,
        nullif(v_recurrence->>'occurrenceCount', '')::integer,
        v_weekdays, v_uid, v_uid
      );
    else
      update public.calendar_recurrence_series
      set frequency = v_recurrence->>'frequency',
          interval_value = (v_recurrence->>'intervalValue')::integer,
          ends_on = nullif(v_recurrence->>'endsOn', '')::date,
          occurrence_count = nullif(v_recurrence->>'occurrenceCount', '')::integer,
          weekdays = v_weekdays,
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

revoke all on function public.calendar_save_event(uuid, jsonb) from public, anon;
grant execute on function public.calendar_save_event(uuid, jsonb) to authenticated;

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
      r.occurrence_count,
      r.weekdays
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

    for v_index in 0..4999 loop
      exit when v.occurrence_count is not null and v_index >= v.occurrence_count;
      v_date := public.calendar_recurrence_date(
        v.starts_on,
        v.frequency,
        v.interval_value,
        v.weekdays,
        v_index
      );
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

revoke all on function public.calendar_due_reminder_occurrences(timestamptz, timestamptz)
  from public, anon, authenticated;
