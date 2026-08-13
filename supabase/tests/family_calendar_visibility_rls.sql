-- Kör endast mot lokal/test-Supabase efter hotfix 0.8.2-migrationen.
-- All testdata och alla mutationer rullas tillbaka.
begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('98000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'visibility-admin@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('98000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'visibility-adult@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('98000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'visibility-member@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('98000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'visibility-other@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('98000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'visibility-inactive@test.invalid', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.households (id, slug, name)
values ('98000000-0000-4000-8000-000000000099', 'visibility-other', 'Annat visibility-hushåll')
on conflict do nothing;

update public.profiles set name = 'Patrik', role = 'admin', household_id = '24000000-0000-4000-8000-000000000024', is_active = true
where id = '98000000-0000-4000-8000-000000000001';
update public.profiles set name = 'Åsa', role = 'adult', household_id = '24000000-0000-4000-8000-000000000024', is_active = true
where id = '98000000-0000-4000-8000-000000000002';
update public.profiles set name = 'Felix', role = 'member', household_id = '24000000-0000-4000-8000-000000000024', is_active = true
where id = '98000000-0000-4000-8000-000000000003';
update public.profiles set name = 'Annan', role = 'adult', household_id = '98000000-0000-4000-8000-000000000099', is_active = true
where id = '98000000-0000-4000-8000-000000000004';
update public.profiles set name = 'Inaktiv', role = 'adult', household_id = '24000000-0000-4000-8000-000000000024',
  is_active = false, deactivated_at = now(), deactivated_by = '98000000-0000-4000-8000-000000000001'
where id = '98000000-0000-4000-8000-000000000005';

insert into public.calendar_events (
  id, household_id, title, description, created_by, updated_by,
  starts_at, ends_at, all_day, is_family_event, reminder_type
)
values
  ('98100000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000024', 'Patrik jobb', 'Test', '98000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '2026-08-17T06:00:00Z', '2026-08-17T14:00:00Z', false, false, 'none'),
  ('98100000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000024', 'Åsa jobb', 'Test', '98000000-0000-4000-8000-000000000002', '98000000-0000-4000-8000-000000000002', '2026-08-18T06:00:00Z', '2026-08-18T14:00:00Z', false, false, 'none'),
  ('98100000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000024', 'Felix jobb', 'Test', '98000000-0000-4000-8000-000000000003', '98000000-0000-4000-8000-000000000003', '2026-08-19T06:00:00Z', '2026-08-19T14:00:00Z', false, false, 'none'),
  ('98100000-0000-4000-8000-000000000004', '98000000-0000-4000-8000-000000000099', 'Annat hushåll', 'Test', '98000000-0000-4000-8000-000000000004', '98000000-0000-4000-8000-000000000004', '2026-08-17T06:00:00Z', '2026-08-17T14:00:00Z', false, false, 'none');

insert into public.calendar_event_participants (event_id, profile_id, household_id)
values
  ('98100000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000024'),
  ('98100000-0000-4000-8000-000000000002', '98000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000024'),
  ('98100000-0000-4000-8000-000000000003', '98000000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000024'),
  ('98100000-0000-4000-8000-000000000004', '98000000-0000-4000-8000-000000000004', '98000000-0000-4000-8000-000000000099');

set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
declare
  visible jsonb[];
  profile_count integer;
begin
  select array_agg(row_data)
  into visible
  from public.calendar_events_in_range('2026-08-16T00:00:00Z', '2026-08-24T00:00:00Z') row_data;

  if coalesce(array_length(visible, 1), 0) <> 3 then
    raise exception 'TEST_FAILED_MEMBER_SAME_HOUSEHOLD_EVENT_COUNT';
  end if;
  if not exists (
    select 1 from unnest(visible) row_data
    where row_data->>'title' = 'Patrik jobb'
      and row_data->'participants' @> '[{"id":"98000000-0000-4000-8000-000000000001"}]'::jsonb
  ) then raise exception 'TEST_FAILED_ADMIN_PARTICIPANT_MISSING'; end if;
  if not exists (
    select 1 from unnest(visible) row_data
    where row_data->>'title' = 'Åsa jobb'
      and row_data->'participants' @> '[{"id":"98000000-0000-4000-8000-000000000002"}]'::jsonb
  ) then raise exception 'TEST_FAILED_ADULT_PARTICIPANT_MISSING'; end if;
  if exists (select 1 from unnest(visible) row_data where row_data->>'title' = 'Annat hushåll') then
    raise exception 'TEST_FAILED_CROSS_HOUSEHOLD_EVENT_VISIBLE';
  end if;

  select count(*) into profile_count from public.dashboard_list_active_profiles();
  if profile_count <> 3 then raise exception 'TEST_FAILED_DASHBOARD_PROFILE_SCOPE'; end if;
  if exists (select 1 from public.dashboard_list_active_profiles() where name in ('Annan', 'Inaktiv')) then
    raise exception 'TEST_FAILED_DASHBOARD_PROFILE_ISOLATION';
  end if;

  if (select count(*) from public.calendar_event_participants) <> 3 then
    raise exception 'TEST_FAILED_PARTICIPANT_RLS_SCOPE';
  end if;
end $$;

do $$ begin
  begin
    perform public.calendar_save_event(
      '98100000-0000-4000-8000-000000000001',
      '{"title":"Otillåten update","description":"Test","allDay":false,"startsAt":"2026-08-17T06:00:00Z","endsAt":"2026-08-17T14:00:00Z","isFamilyEvent":false,"participantIds":["98000000-0000-4000-8000-000000000003"],"reminderOffsetsMinutes":[],"recurrence":null}'::jsonb
    );
    raise exception 'TEST_FAILED_MEMBER_UPDATED_ADMIN_EVENT';
  exception when insufficient_privilege then null; end;

  begin
    perform public.calendar_delete_event('98100000-0000-4000-8000-000000000002', 'series', null);
    raise exception 'TEST_FAILED_MEMBER_DELETED_ADULT_EVENT';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

do $$ begin
  if exists (
    select 1 from public.calendar_events_in_range('2026-08-16T00:00:00Z', '2026-08-24T00:00:00Z')
  ) then raise exception 'TEST_FAILED_INACTIVE_READ_EVENTS'; end if;
  begin
    perform public.dashboard_list_active_profiles();
    raise exception 'TEST_FAILED_INACTIVE_READ_DASHBOARD_PROFILES';
  exception when insufficient_privilege then null; end;
end $$;

rollback;
