-- FÅR INTE KÖRAS innan varje befintlig profil finns i den uttryckligen granskade listan nedan.
-- Codex har avsiktligt inte fyllt i några UUID:n. Filen avbryter om listan är tom/ofullständig.
begin;

create temporary table reviewed_calendar_profiles (
  profile_id uuid primary key,
  expected_name text not null,
  expected_email text not null,
  assign_to_storhogsgatan24 boolean not null
) on commit drop;

-- Lägg efter separat granskning in EN rad för VARJE befintlig profil, även de som inte ska kopplas:
-- insert into reviewed_calendar_profiles values
--   ('00000000-0000-0000-0000-000000000000', 'Exakt namn', 'exakt@epost.se', true),
--   ('00000000-0000-0000-0000-000000000001', 'Annan profil', 'annan@epost.se', false);

do $$
begin
  if not exists (select 1 from reviewed_calendar_profiles) then
    raise exception 'HOUSEHOLD_BACKFILL_REVIEW_LIST_EMPTY';
  end if;
  if exists (
    select 1 from public.profiles p
    full join reviewed_calendar_profiles r on r.profile_id = p.id
    where p.id is null or r.profile_id is null
  ) then
    raise exception 'HOUSEHOLD_BACKFILL_UNEXPECTED_OR_MISSING_PROFILE';
  end if;
  if exists (
    select 1 from public.profiles p join reviewed_calendar_profiles r on r.profile_id = p.id
    where p.name is distinct from r.expected_name or lower(p.email) is distinct from lower(r.expected_email)
  ) then
    raise exception 'HOUSEHOLD_BACKFILL_IDENTITY_MISMATCH';
  end if;
  if exists (
    select 1 from public.profiles p join reviewed_calendar_profiles r on r.profile_id = p.id
    where r.assign_to_storhogsgatan24 and p.household_id is not null
      and p.household_id <> '24000000-0000-4000-8000-000000000024'::uuid
  ) then
    raise exception 'HOUSEHOLD_BACKFILL_PROFILE_ALREADY_IN_OTHER_HOUSEHOLD';
  end if;
end $$;

update public.profiles p
set household_id = '24000000-0000-4000-8000-000000000024'::uuid
from reviewed_calendar_profiles r
where p.id = r.profile_id
  and r.assign_to_storhogsgatan24
  and p.household_id is null;

do $$
declare expected_count integer; actual_count integer;
begin
  select count(*) into expected_count from reviewed_calendar_profiles where assign_to_storhogsgatan24;
  select count(*) into actual_count
  from public.profiles p join reviewed_calendar_profiles r on r.profile_id = p.id
  where r.assign_to_storhogsgatan24 and p.household_id = '24000000-0000-4000-8000-000000000024'::uuid;
  if actual_count <> expected_count then raise exception 'HOUSEHOLD_BACKFILL_COUNT_MISMATCH'; end if;
end $$;

select p.id, p.name, p.email, p.role, p.household_id, r.assign_to_storhogsgatan24
from public.profiles p join reviewed_calendar_profiles r on r.profile_id = p.id order by p.name;

-- Byt ROLLBACK till COMMIT först efter att resultatet ovan har granskats i en testkörning.
rollback;
