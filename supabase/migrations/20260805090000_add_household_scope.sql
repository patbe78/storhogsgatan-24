-- Sprint 3, steg 1: hushållsgräns. Denna migration kopplar INTE några profiler.
create table public.households (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(name) between 1 and 100),
  calendar_color text not null default '#0f766e',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from public.households
    where (slug = 'storhogsgatan-24' and id <> '24000000-0000-4000-8000-000000000024'::uuid)
       or (id = '24000000-0000-4000-8000-000000000024'::uuid and slug <> 'storhogsgatan-24')
  ) then
    raise exception 'HOUSEHOLD_ID_OR_SLUG_CONFLICT';
  end if;
  insert into public.households (id, slug, name, calendar_color)
  values ('24000000-0000-4000-8000-000000000024', 'storhogsgatan-24', 'Storhogsgatan 24', '#0f766e')
  on conflict (id) do nothing;
end $$;

alter table public.profiles add column household_id uuid null references public.households (id);
create index profiles_household_id_idx on public.profiles (household_id);
create unique index profiles_id_household_id_key on public.profiles (id, household_id);

create or replace function public.current_household_id()
returns uuid language sql stable security definer set search_path = pg_catalog, public
as $$ select household_id from public.profiles where id = (select auth.uid()) $$;

create or replace function public.current_calendar_role()
returns text language sql stable security definer set search_path = pg_catalog, public
as $$ select role from public.profiles where id = (select auth.uid()) $$;

revoke all on function public.current_household_id() from public;
revoke all on function public.current_calendar_role() from public;
grant execute on function public.current_household_id() to authenticated;
grant execute on function public.current_calendar_role() to authenticated;

create policy "Household members can view calendar profiles"
  on public.profiles for select to authenticated
  using (
    household_id is not null
    and household_id = (select public.current_household_id())
    and (select public.current_calendar_role()) in ('admin', 'adult', 'member')
  );

alter table public.households enable row level security;
create policy "Members can view their household"
  on public.households for select to authenticated
  using (id = (select public.current_household_id()) and (select public.current_calendar_role()) in ('admin', 'adult', 'member'));
grant select on public.households to authenticated;

-- Försvar i djupet: även framtida felaktiga grants får inte öppna säkerhetsfälten.
create or replace function public.protect_profile_security_fields()
returns trigger language plpgsql set search_path = pg_catalog, public
as $$
begin
  if (old.role is distinct from new.role or old.household_id is distinct from new.household_id)
     and current_user not in ('postgres', 'service_role') then
    raise exception 'PROFILE_SECURITY_FIELDS_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_profile_security_fields
before update of role, household_id on public.profiles
for each row execute function public.protect_profile_security_fields();

revoke update on public.profiles from authenticated;
grant update (name, email, avatar_url, color) on public.profiles to authenticated;

comment on column public.profiles.household_id is
  'Nullable tills profilen uttryckligen har godkänts i en separat, granskad household-backfill.';
