-- Sprint 4B: inactive profiles retain history but cannot mutate calendar data.
create or replace function public.current_calendar_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active
$$;

create or replace function public.calendar_enforce_active_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null and current_user in ('postgres', 'service_role') then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_active) then
    raise exception 'CALENDAR_INACTIVE' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger calendar_categories_require_active
before insert or update or delete on public.calendar_categories
for each row execute function public.calendar_enforce_active_mutation();
create trigger calendar_series_require_active
before insert or update or delete on public.calendar_recurrence_series
for each row execute function public.calendar_enforce_active_mutation();
create trigger calendar_events_require_active
before insert or update or delete on public.calendar_events
for each row execute function public.calendar_enforce_active_mutation();
create trigger calendar_participants_require_active
before insert or update or delete on public.calendar_event_participants
for each row execute function public.calendar_enforce_active_mutation();

create or replace function public.calendar_list_active_profiles()
returns table (id uuid, name text, color text)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare v_household uuid; v_role text;
begin
  select p.household_id, p.role into v_household, v_role
  from public.profiles p where p.id = auth.uid() and p.is_active;
  if v_household is null or v_role not in ('admin', 'adult', 'member') then
    raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501';
  end if;
  return query
  select p.id, p.name, p.color from public.profiles p
  where p.household_id = v_household and p.is_active and p.role in ('admin', 'adult', 'member')
  order by lower(p.name);
end;
$$;

create or replace function public.calendar_save_event(p_event_id uuid, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid(); v_household uuid; v_role text; v_active boolean; v_event public.calendar_events%rowtype;
  v_event_id uuid := coalesce(p_event_id, gen_random_uuid()); v_series_id uuid; v_participants uuid[];
  v_family boolean := coalesce((p_payload->>'isFamilyEvent')::boolean, false); v_category uuid := nullif(p_payload->>'categoryId', '')::uuid;
  v_all_day boolean := coalesce((p_payload->>'allDay')::boolean, false); v_recurrence jsonb := p_payload->'recurrence';
begin
  select household_id, role, is_active into v_household, v_role, v_active from public.profiles where id = v_uid;
  if v_household is null or not coalesce(v_active, false) or v_role not in ('admin', 'adult', 'member') then raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_payload->>'title', ''))) not between 1 and 150
     or char_length(trim(coalesce(p_payload->>'description', ''))) > 2000 then
    raise exception 'CALENDAR_VALIDATION' using errcode = '22023';
  end if;
  if v_family and v_role not in ('admin', 'adult') then raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501'; end if;

  if p_event_id is not null then
    select * into v_event from public.calendar_events where id = p_event_id and household_id = v_household;
    if not found or (v_role <> 'admin' and v_event.created_by <> v_uid) then raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501'; end if;
    v_series_id := v_event.recurrence_series_id;
  end if;

  if v_category is not null
     and not (p_event_id is not null and v_event.category_id = v_category)
     and not exists (select 1 from public.calendar_categories where id = v_category and household_id = v_household and not is_archived) then
    raise exception 'CALENDAR_VALIDATION_ARCHIVED_CATEGORY' using errcode = '22023';
  end if;

  if v_family then
    select array_agg(id order by id) into v_participants from public.profiles
    where household_id = v_household and is_active and role in ('admin', 'adult', 'member');
  else
    select array_agg(value::uuid) into v_participants from jsonb_array_elements_text(coalesce(p_payload->'participantIds', '[]'::jsonb));
  end if;
  if coalesce(array_length(v_participants, 1), 0) = 0 then raise exception 'CALENDAR_VALIDATION_PARTICIPANTS' using errcode = '22023'; end if;
  if exists (select 1 from unnest(v_participants) id where not exists (select 1 from public.profiles p where p.id = id and p.household_id = v_household and p.is_active and p.role in ('admin', 'adult', 'member'))) then
    raise exception 'CALENDAR_FORBIDDEN_PARTICIPANT' using errcode = '42501';
  end if;
  if v_role = 'member' and not (v_uid = any(v_participants)) then raise exception 'CALENDAR_FORBIDDEN_MEMBER_SELF_REQUIRED' using errcode = '42501'; end if;

  if v_recurrence is not null and jsonb_typeof(v_recurrence) <> 'null' then
    if coalesce((v_recurrence->>'intervalValue')::integer, 0) <= 0
      or ((nullif(v_recurrence->>'endsOn', '') is not null) and (v_recurrence->>'occurrenceCount') is not null) then
      raise exception 'CALENDAR_VALIDATION_RECURRENCE' using errcode = '22023';
    end if;
    if v_series_id is null then
      v_series_id := gen_random_uuid();
      insert into public.calendar_recurrence_series (id, household_id, frequency, interval_value, starts_on, ends_on, occurrence_count, created_by, updated_by)
      values (v_series_id, v_household, v_recurrence->>'frequency', (v_recurrence->>'intervalValue')::integer,
        coalesce(nullif(p_payload->>'allDayStart', '')::date, ((p_payload->>'startsAt')::timestamptz at time zone 'Europe/Stockholm')::date),
        nullif(v_recurrence->>'endsOn', '')::date, nullif(v_recurrence->>'occurrenceCount', '')::integer, v_uid, v_uid);
    else
      update public.calendar_recurrence_series set frequency = v_recurrence->>'frequency', interval_value = (v_recurrence->>'intervalValue')::integer,
        ends_on = nullif(v_recurrence->>'endsOn', '')::date, occurrence_count = nullif(v_recurrence->>'occurrenceCount', '')::integer, updated_by = v_uid
      where id = v_series_id and household_id = v_household;
    end if;
  end if;

  if p_event_id is null then
    insert into public.calendar_events (id, household_id, title, description, location, notes, category_id, created_by, updated_by, starts_at, ends_at, all_day, all_day_start, all_day_end, is_family_event, reminder_type, reminder_offset_minutes, external_source, external_id, recurrence_series_id)
    values (v_event_id, v_household, trim(p_payload->>'title'), coalesce(trim(p_payload->>'description'), ''), nullif(trim(p_payload->>'location'), ''), nullif(trim(p_payload->>'notes'), ''), v_category, v_uid, v_uid,
      case when v_all_day then null else (p_payload->>'startsAt')::timestamptz end, case when v_all_day then null else (p_payload->>'endsAt')::timestamptz end, v_all_day,
      case when v_all_day then (p_payload->>'allDayStart')::date else null end, case when v_all_day then (p_payload->>'allDayEnd')::date else null end, v_family,
      coalesce(p_payload->>'reminderType', 'none'), case when p_payload->>'reminderType' = 'custom' then (p_payload->>'reminderOffsetMinutes')::integer else null end,
      nullif(p_payload->>'externalSource', ''), nullif(p_payload->>'externalId', ''), v_series_id);
  else
    update public.calendar_events set title = trim(p_payload->>'title'), description = coalesce(trim(p_payload->>'description'), ''), location = nullif(trim(p_payload->>'location'), ''), notes = nullif(trim(p_payload->>'notes'), ''),
      category_id = v_category, updated_by = v_uid, starts_at = case when v_all_day then null else (p_payload->>'startsAt')::timestamptz end,
      ends_at = case when v_all_day then null else (p_payload->>'endsAt')::timestamptz end, all_day = v_all_day,
      all_day_start = case when v_all_day then (p_payload->>'allDayStart')::date else null end, all_day_end = case when v_all_day then (p_payload->>'allDayEnd')::date else null end,
      is_family_event = v_family, reminder_type = coalesce(p_payload->>'reminderType', 'none'), reminder_offset_minutes = case when p_payload->>'reminderType' = 'custom' then (p_payload->>'reminderOffsetMinutes')::integer else null end,
      external_source = nullif(p_payload->>'externalSource', ''), external_id = nullif(p_payload->>'externalId', ''), recurrence_series_id = v_series_id
    where id = v_event_id;
    delete from public.calendar_event_participants where event_id = v_event_id;
  end if;
  insert into public.calendar_event_participants (event_id, profile_id, household_id) select v_event_id, id, v_household from unnest(v_participants) id;
  return v_event_id;
end;
$$;

create or replace function public.calendar_delete_event(p_event_id uuid, p_scope text, p_occurrence_date date)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_uid uuid := auth.uid(); v_role text; v_household uuid; v_active boolean; v_event public.calendar_events%rowtype; v_series uuid; v_prior_occurrences integer;
begin
  select household_id, role, is_active into v_household, v_role, v_active from public.profiles where id = v_uid;
  select * into v_event from public.calendar_events where id = p_event_id and household_id = v_household for update;
  if not found or not coalesce(v_active, false) or v_role not in ('admin', 'adult', 'member') or (v_role <> 'admin' and v_event.created_by <> v_uid) then raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501'; end if;
  v_series := v_event.recurrence_series_id;
  if p_scope = 'future' and v_series is not null then
    v_prior_occurrences := public.calendar_validate_series_occurrence(v_series, p_occurrence_date, null);
    if v_prior_occurrences = 0 then
      delete from public.calendar_events where id = p_event_id; delete from public.calendar_recurrence_series where id = v_series;
    else
      update public.calendar_recurrence_series set ends_on = p_occurrence_date - 1, occurrence_count = null, updated_by = v_uid where id = v_series;
    end if;
  elsif p_scope = 'series' then
    delete from public.calendar_events where id = p_event_id;
    if v_series is not null then delete from public.calendar_recurrence_series where id = v_series; end if;
  else raise exception 'CALENDAR_VALIDATION_SCOPE' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.calendar_enforce_active_mutation() from public, anon, authenticated;
revoke all on function public.calendar_list_active_profiles() from public, anon;
grant execute on function public.calendar_list_active_profiles() to authenticated;
