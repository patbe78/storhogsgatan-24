-- Sprint 4B: non-destructive membership deactivation state.
alter table public.profiles
  add column is_active boolean not null default true,
  add column deactivated_at timestamptz null,
  add column deactivated_by uuid null references public.profiles (id);

alter table public.profiles
  add constraint profiles_active_state_consistent
  check (
    (is_active and deactivated_at is null and deactivated_by is null)
    or
    (not is_active and deactivated_at is not null and deactivated_by is not null)
  );

create index profiles_household_active_idx
  on public.profiles (household_id, is_active);

create or replace function public.protect_profile_active_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if (
    old.is_active is distinct from new.is_active
    or old.deactivated_at is distinct from new.deactivated_at
    or old.deactivated_by is distinct from new.deactivated_by
  ) and current_user not in ('postgres', 'service_role') then
    raise exception 'PROFILE_SECURITY_FIELDS_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_profile_active_fields
before update of is_active, deactivated_at, deactivated_by on public.profiles
for each row execute function public.protect_profile_active_fields();

revoke update (is_active, deactivated_at, deactivated_by)
  on public.profiles from authenticated;

comment on column public.profiles.is_active is
  'False blocks mutations while preserving the profile and all historical relations.';
