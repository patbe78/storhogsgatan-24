-- Sprint 4F: personal calendar defaults. A parent row means that a custom default exists;
-- selected entry rows are sparse. No parent row means the system default "show everything".
create table public.calendar_default_filters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, household_id),
  foreign key (user_id, household_id) references public.profiles (id, household_id) on delete cascade
);

create table public.calendar_default_filter_entries (
  filter_user_id uuid not null,
  household_id uuid not null,
  participant_profile_id uuid not null,
  -- NULL is the explicit, system-defined "Ingen kategori" identity.
  category_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (filter_user_id, household_id)
    references public.calendar_default_filters (user_id, household_id)
    on update cascade on delete cascade,
  foreign key (participant_profile_id, household_id)
    references public.profiles (id, household_id),
  foreign key (category_id, household_id)
    references public.calendar_categories (id, household_id),
  unique nulls not distinct (filter_user_id, participant_profile_id, category_id)
);

create index calendar_default_filter_entries_user_idx
  on public.calendar_default_filter_entries (filter_user_id);
create index calendar_default_filter_entries_participant_idx
  on public.calendar_default_filter_entries (participant_profile_id);
create index calendar_default_filter_entries_category_idx
  on public.calendar_default_filter_entries (category_id)
  where category_id is not null;

create trigger calendar_default_filters_updated_at
before update on public.calendar_default_filters
for each row execute function public.set_calendar_updated_at();

create trigger calendar_default_filter_entries_updated_at
before update on public.calendar_default_filter_entries
for each row execute function public.set_calendar_updated_at();

alter table public.calendar_default_filters enable row level security;
alter table public.calendar_default_filter_entries enable row level security;

create policy "Users can read their calendar default"
on public.calendar_default_filters for select to authenticated
using (
  user_id = (select auth.uid())
  and household_id = (select public.current_household_id())
  and (select public.current_calendar_role()) in ('admin', 'adult', 'member')
);

create policy "Users can create their calendar default"
on public.calendar_default_filters for insert to authenticated
with check (
  user_id = (select auth.uid())
  and household_id = (select public.current_household_id())
  and (select public.current_calendar_role()) in ('admin', 'adult', 'member')
);

create policy "Users can update their calendar default"
on public.calendar_default_filters for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and household_id = (select public.current_household_id())
  and (select public.current_calendar_role()) in ('admin', 'adult', 'member')
);

create policy "Users can delete their calendar default"
on public.calendar_default_filters for delete to authenticated
using (user_id = (select auth.uid()));

create policy "Users can read their calendar default entries"
on public.calendar_default_filter_entries for select to authenticated
using (
  filter_user_id = (select auth.uid())
  and household_id = (select public.current_household_id())
  and (select public.current_calendar_role()) in ('admin', 'adult', 'member')
);

create policy "Users can create their calendar default entries"
on public.calendar_default_filter_entries for insert to authenticated
with check (
  filter_user_id = (select auth.uid())
  and household_id = (select public.current_household_id())
  and (select public.current_calendar_role()) in ('admin', 'adult', 'member')
);

create policy "Users can update their calendar default entries"
on public.calendar_default_filter_entries for update to authenticated
using (filter_user_id = (select auth.uid()))
with check (
  filter_user_id = (select auth.uid())
  and household_id = (select public.current_household_id())
  and (select public.current_calendar_role()) in ('admin', 'adult', 'member')
);

create policy "Users can delete their calendar default entries"
on public.calendar_default_filter_entries for delete to authenticated
using (filter_user_id = (select auth.uid()));

grant select, insert, update, delete on public.calendar_default_filters to authenticated;
grant select, insert, update, delete on public.calendar_default_filter_entries to authenticated;

create or replace function public.calendar_replace_default_filter(p_entries jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_role text;
  v_active boolean;
begin
  if jsonb_typeof(coalesce(p_entries, '[]'::jsonb)) <> 'array' then
    raise exception 'CALENDAR_FILTER_VALIDATION' using errcode = '22023';
  end if;

  select household_id, role, is_active
  into v_household, v_role, v_active
  from public.profiles
  where id = v_uid;

  if v_household is null
    or not coalesce(v_active, false)
    or v_role not in ('admin', 'adult', 'member') then
    raise exception 'CALENDAR_FILTER_FORBIDDEN' using errcode = '42501';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) entry
    where nullif(entry->>'participant_profile_id', '') is null
  ) then
    raise exception 'CALENDAR_FILTER_VALIDATION' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) entry
    where not exists (
      select 1
      from public.profiles profile
      where profile.id = (entry->>'participant_profile_id')::uuid
        and profile.household_id = v_household
        and profile.is_active
        and profile.role in ('admin', 'adult', 'member')
    )
  ) then
    raise exception 'CALENDAR_FILTER_FORBIDDEN_PARTICIPANT' using errcode = '42501';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) entry
    where nullif(entry->>'category_id', '') is not null
      and not exists (
        select 1
        from public.calendar_categories category
        where category.id = (entry->>'category_id')::uuid
          and category.household_id = v_household
          and not category.is_archived
      )
  ) then
    raise exception 'CALENDAR_FILTER_FORBIDDEN_CATEGORY' using errcode = '42501';
  end if;

  -- Delete first so a household move cannot leave stale child rows. The function is one
  -- transaction, so any later error restores the previously saved default automatically.
  delete from public.calendar_default_filter_entries where filter_user_id = v_uid;

  insert into public.calendar_default_filters (user_id, household_id)
  values (v_uid, v_household)
  on conflict (user_id) do update
  set household_id = excluded.household_id,
      updated_at = now();

  insert into public.calendar_default_filter_entries (
    filter_user_id,
    household_id,
    participant_profile_id,
    category_id
  )
  select distinct
    v_uid,
    v_household,
    (entry->>'participant_profile_id')::uuid,
    nullif(entry->>'category_id', '')::uuid
  from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) entry;
end;
$$;

revoke all on function public.calendar_replace_default_filter(jsonb) from public, anon;
grant execute on function public.calendar_replace_default_filter(jsonb) to authenticated;

comment on table public.calendar_default_filters is
  'One row means the user has a custom calendar default; no row means show all.';
comment on table public.calendar_default_filter_entries is
  'Sparse selected cells. category_id NULL is the virtual uncategorized column.';
comment on function public.calendar_replace_default_filter(jsonb) is
  'Atomically replaces the authenticated user personal calendar default matrix.';
