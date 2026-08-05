-- READ ONLY. Kör först i Supabase SQL Editor och granska hela resultatet.
select
  p.id as profile_id,
  p.name,
  p.email,
  p.role,
  p.household_id,
  h.slug as current_household_slug
from public.profiles p
left join public.households h on h.id = p.household_id
order by lower(p.name), p.id;

select
  count(*) as total_profiles,
  count(*) filter (where household_id is null) as profiles_without_household,
  count(*) filter (where household_id is not null) as profiles_with_household
from public.profiles;
