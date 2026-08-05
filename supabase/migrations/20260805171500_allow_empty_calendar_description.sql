-- Sprint 3.1: tillåt tom, men aldrig null, aktivitetsbeskrivning.
do $$
declare
  v_constraint_names text[];
begin
  select array_agg(c.conname order by c.conname)
  into v_constraint_names
  from pg_catalog.pg_constraint c
  where c.conrelid = 'public.calendar_events'::regclass
    and c.contype = 'c'
    and pg_catalog.strpos(
      pg_catalog.replace(pg_catalog.pg_get_constraintdef(c.oid), ' ', ''),
      'char_length(description)'
    ) > 0;

  if coalesce(pg_catalog.array_length(v_constraint_names, 1), 0) <> 1 then
    raise exception 'CALENDAR_DESCRIPTION_CONSTRAINT_NOT_UNIQUE: %', coalesce(v_constraint_names::text, '{}');
  end if;

  execute pg_catalog.format(
    'alter table public.calendar_events drop constraint %I',
    v_constraint_names[1]
  );
end $$;

alter table public.calendar_events
  add constraint calendar_events_description_length_check
  check (char_length(description) <= 2000);

create or replace function public.calendar_save_event(p_event_id uuid, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid(); v_household uuid; v_role text; v_event public.calendar_events%rowtype;
  v_event_id uuid := coalesce(p_event_id, gen_random_uuid()); v_series_id uuid; v_participants uuid[];
  v_family boolean := coalesce((p_payload->>'isFamilyEvent')::boolean, false); v_category uuid := nullif(p_payload->>'categoryId', '')::uuid;
  v_all_day boolean := coalesce((p_payload->>'allDay')::boolean, false); v_recurrence jsonb := p_payload->'recurrence';
begin
  select household_id, role into v_household, v_role from public.profiles where id = v_uid;
  if v_household is null or v_role not in ('admin', 'adult', 'member') then raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501'; end if;
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
    select array_agg(id order by id) into v_participants from public.profiles where household_id = v_household and role in ('admin', 'adult', 'member');
  else
    select array_agg(value::uuid) into v_participants from jsonb_array_elements_text(coalesce(p_payload->'participantIds', '[]'::jsonb));
  end if;
  if coalesce(array_length(v_participants, 1), 0) = 0 then raise exception 'CALENDAR_VALIDATION_PARTICIPANTS' using errcode = '22023'; end if;
  if exists (select 1 from unnest(v_participants) id where not exists (select 1 from public.profiles p where p.id = id and p.household_id = v_household and p.role in ('admin', 'adult', 'member'))) then
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

revoke all on function public.calendar_save_event(uuid, jsonb) from public;
grant execute on function public.calendar_save_event(uuid, jsonb) to authenticated;
