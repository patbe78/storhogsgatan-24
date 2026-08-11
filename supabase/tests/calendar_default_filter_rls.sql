-- Kör endast mot lokal/test-Supabase efter Sprint 4F-migrationen. All testdata rullas tillbaka.
begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('97000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'filter-one@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('97000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'filter-two@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('97000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'filter-other@test.invalid', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.households (id, slug, name)
values ('97000000-0000-4000-8000-000000000099', 'calendar-filter-other', 'Annat filterhushåll')
on conflict do nothing;

update public.profiles
set name = 'Filter ett', role = 'admin', household_id = '24000000-0000-4000-8000-000000000024', is_active = true
where id = '97000000-0000-4000-8000-000000000001';
update public.profiles
set name = 'Filter två', role = 'member', household_id = '24000000-0000-4000-8000-000000000024', is_active = true
where id = '97000000-0000-4000-8000-000000000002';
update public.profiles
set name = 'Filter annan', role = 'admin', household_id = '97000000-0000-4000-8000-000000000099', is_active = true
where id = '97000000-0000-4000-8000-000000000003';

insert into public.calendar_categories (id, household_id, name, color, created_by)
values (
  '97000000-0000-4000-8000-000000000010',
  '24000000-0000-4000-8000-000000000024',
  'Filterkategori',
  '#2563eb',
  '97000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- Ingen föräldrarad är system-default (visa allt).
do $$ begin
  if (select count(*) from public.calendar_default_filters) <> 0 then
    raise exception 'TEST_FAILED_NO_DEFAULT_NOT_DISTINCT';
  end if;
end $$;

-- Tom array skapar ett custom-default utan valda celler.
select public.calendar_replace_default_filter('[]'::jsonb);
do $$ begin
  if (select count(*) from public.calendar_default_filters) <> 1
    or (select count(*) from public.calendar_default_filter_entries) <> 0 then
    raise exception 'TEST_FAILED_CUSTOM_EMPTY_NOT_PERSISTED';
  end if;
end $$;

-- NULL-kategori är en riktig logisk cell och dubbletter dedupliceras atomiskt.
select public.calendar_replace_default_filter(
  '[
    {"participant_profile_id":"97000000-0000-4000-8000-000000000001","category_id":null},
    {"participant_profile_id":"97000000-0000-4000-8000-000000000001","category_id":null},
    {"participant_profile_id":"97000000-0000-4000-8000-000000000002","category_id":"97000000-0000-4000-8000-000000000010"}
  ]'::jsonb
);
do $$ begin
  if (select count(*) from public.calendar_default_filter_entries) <> 2
    or (select count(*) from public.calendar_default_filter_entries where category_id is null) <> 1 then
    raise exception 'TEST_FAILED_UNCATEGORIZED_OR_UNIQUENESS';
  end if;
end $$;

-- Personer och kategorier från andra hushåll nekas och föregående state återställs av transaktionen.
do $$ begin
  begin
    perform public.calendar_replace_default_filter(
      '[{"participant_profile_id":"97000000-0000-4000-8000-000000000003","category_id":null}]'::jsonb
    );
    raise exception 'TEST_FAILED_FOREIGN_PARTICIPANT_ACCEPTED';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.calendar_default_filter_entries) <> 2 then
    raise exception 'TEST_FAILED_FAILED_SAVE_DESTROYED_PREVIOUS_DEFAULT';
  end if;
end $$;

-- Den andra användaren kan inte läsa eller skriva den första användarens default via direkt REST-lik SQL.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.calendar_default_filters) <> 0
    or (select count(*) from public.calendar_default_filter_entries) <> 0 then
    raise exception 'TEST_FAILED_CROSS_USER_READ';
  end if;
  begin
    insert into public.calendar_default_filters (user_id, household_id)
    values ('97000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000024');
    raise exception 'TEST_FAILED_CROSS_USER_WRITE';
  exception when insufficient_privilege then null; end;
end $$;

select public.calendar_replace_default_filter(
  '[{"participant_profile_id":"97000000-0000-4000-8000-000000000002","category_id":null}]'::jsonb
);
do $$ begin
  if (select count(*) from public.calendar_default_filters) <> 1
    or (select count(*) from public.calendar_default_filter_entries) <> 1 then
    raise exception 'TEST_FAILED_SECOND_USER_DEFAULT';
  end if;
end $$;

-- Radering gäller endast den egna raden och cascade tar bort entries.
delete from public.calendar_default_filters where user_id = auth.uid();
do $$ begin
  if (select count(*) from public.calendar_default_filters) <> 0
    or (select count(*) from public.calendar_default_filter_entries) <> 0 then
    raise exception 'TEST_FAILED_OWN_DELETE';
  end if;
end $$;

reset role;
rollback;
