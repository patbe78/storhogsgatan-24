-- MANUELLT GRANSKNINGSSKRIPT. Kör först efter godkänd household-backfill.
-- Codex har avsiktligt inte fyllt i några profil-UUID:n. Standardläget är ROLLBACK.
begin;

create temporary table reviewed_calendar_profile_colors (
  profile_id uuid primary key,
  expected_name text not null,
  expected_email text not null,
  desired_color text not null check (desired_color ~ '^#[0-9A-Fa-f]{6}$')
) on commit drop;

-- Lägg endast in de profiler som uttryckligen ska få en standardfärg:
-- insert into reviewed_calendar_profile_colors values
--   ('00000000-0000-0000-0000-000000000000', 'Exakt namn', 'exakt@epost.se', '#2563eb');

do $$
begin
  if not exists (select 1 from reviewed_calendar_profile_colors) then
    raise exception 'PROFILE_COLOR_REVIEW_LIST_EMPTY';
  end if;
  if exists (
    select 1
    from reviewed_calendar_profile_colors r
    left join public.profiles p on p.id = r.profile_id
    where p.id is null
  ) then
    raise exception 'PROFILE_COLOR_REVIEW_PROFILE_NOT_FOUND';
  end if;
  if exists (
    select 1
    from reviewed_calendar_profile_colors r
    join public.profiles p on p.id = r.profile_id
    where p.name is distinct from r.expected_name
       or lower(p.email) is distinct from lower(r.expected_email)
  ) then
    raise exception 'PROFILE_COLOR_REVIEW_IDENTITY_MISMATCH';
  end if;
  if exists (
    select 1
    from reviewed_calendar_profile_colors r
    join public.profiles p on p.id = r.profile_id
    where p.household_id is distinct from '24000000-0000-4000-8000-000000000024'::uuid
  ) then
    raise exception 'PROFILE_COLOR_REVIEW_BACKFILL_REQUIRED';
  end if;
end $$;

update public.profiles p
set color = r.desired_color
from reviewed_calendar_profile_colors r
where p.id = r.profile_id
  and p.household_id = '24000000-0000-4000-8000-000000000024'::uuid
  and p.color is null;

select p.id, p.name, p.email, p.household_id, p.color as resulting_color, r.desired_color
from public.profiles p
join reviewed_calendar_profile_colors r on r.profile_id = p.id
order by p.name, p.id;

-- Byt ROLLBACK till COMMIT först efter separat granskning av resultatet ovan.
rollback;
