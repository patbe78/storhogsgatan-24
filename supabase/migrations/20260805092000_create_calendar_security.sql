-- Sprint 3, steg 3: RLS och smala mutations-RPC:er.
create policy "Calendar roles can read categories" on public.calendar_categories for select to authenticated
using (household_id = (select public.current_household_id()) and (select public.current_calendar_role()) in ('admin', 'adult', 'member'));
create policy "Calendar roles can read series" on public.calendar_recurrence_series for select to authenticated
using (household_id = (select public.current_household_id()) and (select public.current_calendar_role()) in ('admin', 'adult', 'member'));
create policy "Calendar roles can read events" on public.calendar_events for select to authenticated
using (household_id = (select public.current_household_id()) and (select public.current_calendar_role()) in ('admin', 'adult', 'member'));
create policy "Calendar roles can read participants" on public.calendar_event_participants for select to authenticated
using (household_id = (select public.current_household_id()) and (select public.current_calendar_role()) in ('admin', 'adult', 'member'));

grant select on public.calendar_categories, public.calendar_recurrence_series, public.calendar_events, public.calendar_event_participants to authenticated;
revoke insert, update, delete on public.calendar_categories, public.calendar_recurrence_series, public.calendar_events, public.calendar_event_participants from authenticated;

create or replace function public.calendar_events_in_range(p_range_start timestamptz, p_range_end timestamptz)
returns setof jsonb language sql stable security invoker set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', e.id, 'household_id', e.household_id, 'title', e.title, 'description', e.description,
    'location', e.location, 'notes', e.notes, 'category_id', e.category_id, 'category_name', c.name,
    'category_color', c.color, 'created_by', e.created_by, 'updated_by', e.updated_by,
    'starts_at', e.starts_at, 'ends_at', e.ends_at, 'all_day', e.all_day,
    'all_day_start', e.all_day_start, 'all_day_end', e.all_day_end, 'is_family_event', e.is_family_event,
    'reminder_type', e.reminder_type, 'reminder_offset_minutes', e.reminder_offset_minutes,
    'external_source', e.external_source, 'external_id', e.external_id,
    'recurrence_series_id', e.recurrence_series_id, 'created_at', e.created_at, 'updated_at', e.updated_at,
    'participants', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'color', p.color) order by p.name)
      from public.calendar_event_participants ep join public.profiles p on p.id = ep.profile_id where ep.event_id = e.id), '[]'::jsonb),
    'recurrence', case when r.id is null then null else jsonb_build_object(
      'id', r.id, 'frequency', r.frequency, 'interval_value', r.interval_value, 'starts_on', r.starts_on,
      'ends_on', r.ends_on, 'occurrence_count', r.occurrence_count, 'parent_series_id', r.parent_series_id,
      'split_from_date', r.split_from_date) end
  )
  from public.calendar_events e
  left join public.calendar_categories c on c.id = e.category_id
  left join public.calendar_recurrence_series r on r.id = e.recurrence_series_id
  where e.household_id = (select public.current_household_id())
    and (
      (e.recurrence_series_id is null and ((not e.all_day and e.starts_at < p_range_end and e.ends_at > p_range_start)
        or (e.all_day and e.all_day_start <= (p_range_end at time zone 'Europe/Stockholm')::date and e.all_day_end >= (p_range_start at time zone 'Europe/Stockholm')::date)))
      or
      (e.recurrence_series_id is not null and r.starts_on <= (p_range_end at time zone 'Europe/Stockholm')::date
        and (r.ends_on is null or r.ends_on >= (p_range_start at time zone 'Europe/Stockholm')::date))
    );
$$;

revoke all on function public.calendar_events_in_range(timestamptz, timestamptz) from public;
grant execute on function public.calendar_events_in_range(timestamptz, timestamptz) to authenticated;

-- Intern, databasauktoritativ kontroll för split/radering av återkommande serier.
-- Returvärdet är antalet förekomster före det valda datumet (nollbaserat index).
create or replace function public.calendar_validate_series_occurrence(
  p_series_id uuid,
  p_occurrence_date date,
  p_expected_prior_occurrences integer default null
)
returns integer language plpgsql security definer set search_path = pg_catalog, public
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

  select * into v_series from public.calendar_recurrence_series where id = p_series_id for update;
  if not found then
    raise exception 'CALENDAR_VALIDATION_SERIES' using errcode = '22023';
  end if;
  if p_occurrence_date < v_series.starts_on then
    raise exception 'CALENDAR_VALIDATION_OCCURRENCE_BEFORE_START' using errcode = '22023';
  end if;
  if v_series.ends_on is not null and p_occurrence_date > v_series.ends_on then
    raise exception 'CALENDAR_VALIDATION_OCCURRENCE_AFTER_END' using errcode = '22023';
  end if;

  if v_series.frequency in ('daily', 'weekly') then
    v_day_delta := p_occurrence_date - v_series.starts_on;
    v_day_step := v_series.interval_value::bigint * case when v_series.frequency = 'weekly' then 7 else 1 end;
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
  if p_expected_prior_occurrences is not null and p_expected_prior_occurrences <> v_index then
    raise exception 'CALENDAR_VALIDATION_PRIOR_OCCURRENCE_COUNT' using errcode = '22023';
  end if;
  return v_index;
end;
$$;

revoke all on function public.calendar_validate_series_occurrence(uuid, date, integer) from public, authenticated;

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
     or char_length(trim(coalesce(p_payload->>'description', ''))) not between 1 and 2000 then
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
    values (v_event_id, v_household, trim(p_payload->>'title'), trim(p_payload->>'description'), nullif(trim(p_payload->>'location'), ''), nullif(trim(p_payload->>'notes'), ''), v_category, v_uid, v_uid,
      case when v_all_day then null else (p_payload->>'startsAt')::timestamptz end, case when v_all_day then null else (p_payload->>'endsAt')::timestamptz end, v_all_day,
      case when v_all_day then (p_payload->>'allDayStart')::date else null end, case when v_all_day then (p_payload->>'allDayEnd')::date else null end, v_family,
      coalesce(p_payload->>'reminderType', 'none'), case when p_payload->>'reminderType' = 'custom' then (p_payload->>'reminderOffsetMinutes')::integer else null end,
      nullif(p_payload->>'externalSource', ''), nullif(p_payload->>'externalId', ''), v_series_id);
  else
    update public.calendar_events set title = trim(p_payload->>'title'), description = trim(p_payload->>'description'), location = nullif(trim(p_payload->>'location'), ''), notes = nullif(trim(p_payload->>'notes'), ''),
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
declare v_uid uuid := auth.uid(); v_role text; v_household uuid; v_event public.calendar_events%rowtype; v_series uuid; v_prior_occurrences integer;
begin
  select household_id, role into v_household, v_role from public.profiles where id = v_uid;
  select * into v_event from public.calendar_events where id = p_event_id and household_id = v_household for update;
  if not found or v_role not in ('admin', 'adult', 'member') or (v_role <> 'admin' and v_event.created_by <> v_uid) then raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501'; end if;
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

create or replace function public.calendar_split_series(p_event_id uuid, p_occurrence_date date, p_prior_occurrences integer, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_original public.calendar_events%rowtype; v_old_series public.calendar_recurrence_series%rowtype; v_new_event uuid; v_new_series uuid; v_remaining integer; v_parent uuid; v_verified_prior integer;
begin
  select * into v_original from public.calendar_events where id = p_event_id and household_id = public.current_household_id() for update;
  if not found or v_original.recurrence_series_id is null then raise exception 'CALENDAR_VALIDATION_SERIES' using errcode = '22023'; end if;
  if public.current_calendar_role() <> 'admin' and v_original.created_by <> auth.uid() then raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501'; end if;
  if p_prior_occurrences is null then
    raise exception 'CALENDAR_VALIDATION_PRIOR_OCCURRENCE_COUNT' using errcode = '22023';
  end if;
  v_verified_prior := public.calendar_validate_series_occurrence(v_original.recurrence_series_id, p_occurrence_date, p_prior_occurrences);
  select * into v_old_series from public.calendar_recurrence_series where id = v_original.recurrence_series_id for update;
  v_parent := v_old_series.id;
  v_remaining := case when v_old_series.occurrence_count is null then null else v_old_series.occurrence_count - v_verified_prior end;
  if v_verified_prior = 0 then
    delete from public.calendar_events where id = p_event_id; delete from public.calendar_recurrence_series where id = v_old_series.id; v_parent := null;
  elsif v_old_series.occurrence_count is not null then
    update public.calendar_recurrence_series set ends_on = null, occurrence_count = v_verified_prior, updated_by = auth.uid() where id = v_old_series.id;
  else
    update public.calendar_recurrence_series set ends_on = p_occurrence_date - 1, occurrence_count = null, updated_by = auth.uid() where id = v_old_series.id;
  end if;
  v_new_event := public.calendar_save_event(null, p_payload - 'id');
  select recurrence_series_id into v_new_series from public.calendar_events where id = v_new_event;
  if v_new_series is null then
    insert into public.calendar_recurrence_series (household_id, frequency, interval_value, starts_on, ends_on, occurrence_count, parent_series_id, split_from_date, created_by, updated_by)
    values (v_old_series.household_id, v_old_series.frequency, v_old_series.interval_value, p_occurrence_date, v_old_series.ends_on, v_remaining, v_parent, p_occurrence_date, auth.uid(), auth.uid()) returning id into v_new_series;
    update public.calendar_events set recurrence_series_id = v_new_series where id = v_new_event;
  else
    update public.calendar_recurrence_series set parent_series_id = v_parent, split_from_date = p_occurrence_date where id = v_new_series;
  end if;
  return v_new_event;
end;
$$;

create or replace function public.calendar_save_category(p_category_id uuid, p_name text, p_icon text, p_color text, p_is_archived boolean)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_id uuid := coalesce(p_category_id, gen_random_uuid()); v_household uuid := public.current_household_id();
begin
  if public.current_calendar_role() <> 'admin' or v_household is null then raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501'; end if;
  if char_length(trim(p_name)) not between 1 and 50 then raise exception 'CALENDAR_VALIDATION' using errcode = '22023'; end if;
  if p_category_id is not null and not exists (select 1 from public.calendar_categories where id = p_category_id and household_id = v_household) then
    raise exception 'CALENDAR_FORBIDDEN_HOUSEHOLD' using errcode = '42501';
  end if;
  insert into public.calendar_categories (id, household_id, name, icon, color, is_archived, created_by)
  values (v_id, v_household, trim(p_name), p_icon, p_color, p_is_archived, auth.uid())
  on conflict (id) do update set name = excluded.name, icon = excluded.icon, color = excluded.color, is_archived = excluded.is_archived;
  return v_id;
end;
$$;

create or replace function public.admin_update_profile_access(p_profile_id uuid, p_role text, p_household_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_caller_household uuid := public.current_household_id(); v_target_household uuid;
begin
  if public.current_calendar_role() <> 'admin' or v_caller_household is null or p_role not in ('admin', 'adult', 'member', 'guest') then
    raise exception 'CALENDAR_FORBIDDEN' using errcode = '42501';
  end if;
  if p_household_id is distinct from v_caller_household then
    raise exception 'CALENDAR_FORBIDDEN_HOUSEHOLD' using errcode = '42501';
  end if;
  select household_id into v_target_household from public.profiles where id = p_profile_id;
  if not found or v_target_household is null or v_target_household <> v_caller_household then
    raise exception 'CALENDAR_FORBIDDEN_HOUSEHOLD' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_profile_id and household_id = v_caller_household;
end;
$$;

revoke all on function public.calendar_save_event(uuid, jsonb), public.calendar_delete_event(uuid, text, date), public.calendar_split_series(uuid, date, integer, jsonb), public.calendar_save_category(uuid, text, text, text, boolean), public.admin_update_profile_access(uuid, text, uuid) from public;
grant execute on function public.calendar_save_event(uuid, jsonb), public.calendar_delete_event(uuid, text, date), public.calendar_split_series(uuid, date, integer, jsonb), public.calendar_save_category(uuid, text, text, text, boolean), public.admin_update_profile_access(uuid, text, uuid) to authenticated;
