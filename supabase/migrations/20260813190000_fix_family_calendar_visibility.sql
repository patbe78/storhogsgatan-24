-- Hotfix 0.8.2: return narrow same-household calendar/profile data without
-- reopening the full profiles table to non-admin household members.

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

create or replace function public.dashboard_list_active_profiles()
returns table (id uuid, name text, role text, color text, is_active boolean)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_household uuid;
  v_role text;
begin
  select p.household_id, p.role
  into v_household, v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if v_household is null or v_role not in ('admin', 'adult', 'member') then
    raise exception 'DASHBOARD_FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select p.id, p.name, p.role, p.color, p.is_active
  from public.profiles p
  where p.household_id = v_household
    and p.is_active
    and p.role in ('admin', 'adult', 'member')
  order by lower(p.name);
end;
$$;

revoke all on function public.dashboard_list_active_profiles() from public, anon;
grant execute on function public.dashboard_list_active_profiles() to authenticated;
