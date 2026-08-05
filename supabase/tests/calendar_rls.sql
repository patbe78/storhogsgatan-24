-- Kör ENDAST mot lokal/test-Supabase efter samtliga Sprint 3-migrationer. All testdata återställs.
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'calendar-admin@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('91000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'calendar-member@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('91000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'calendar-other@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('91000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'calendar-null-admin@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('91000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'calendar-unassigned@test.invalid', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.households (id, slug, name) values ('92000000-0000-4000-8000-000000000002', 'calendar-test-other', 'Annat testhushåll') on conflict do nothing;
update public.profiles set name = 'Testadmin', role = 'admin', household_id = '24000000-0000-4000-8000-000000000024' where id = '91000000-0000-4000-8000-000000000001';
update public.profiles set name = 'Testmember', role = 'member', household_id = '24000000-0000-4000-8000-000000000024' where id = '91000000-0000-4000-8000-000000000002';
update public.profiles set name = 'Annan', role = 'member', household_id = '92000000-0000-4000-8000-000000000002' where id = '91000000-0000-4000-8000-000000000003';
update public.profiles set name = 'Admin utan hushåll', role = 'admin', household_id = null where id = '91000000-0000-4000-8000-000000000004';
update public.profiles set name = 'Oansluten', role = 'member', household_id = null where id = '91000000-0000-4000-8000-000000000005';

-- Member får inte eskalera roll, inte ens med direkt API-lik tabelluppdatering.
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'TEST_FAILED_MEMBER_ESCALATED_ROLE';
  exception when insufficient_privilege then null; end;
  if (select role <> 'member' from public.profiles where id = auth.uid()) then raise exception 'TEST_FAILED_ROLE_CHANGED'; end if;
end $$;

-- Member kan skapa och senare ändra sin egen aktivitet.
do $$ declare owned_id uuid;
begin
  owned_id := public.calendar_save_event(null, '{"title":"Memberägd","description":"Test","allDay":false,"startsAt":"2026-08-11T08:00:00Z","endsAt":"2026-08-11T09:00:00Z","isFamilyEvent":false,"participantIds":["91000000-0000-4000-8000-000000000002"],"reminderType":"none","recurrence":null}'::jsonb);
  perform public.calendar_save_event(owned_id, '{"title":"Member uppdaterad","description":"Test","allDay":false,"startsAt":"2026-08-11T08:00:00Z","endsAt":"2026-08-11T09:00:00Z","isFamilyEvent":false,"participantIds":["91000000-0000-4000-8000-000000000002"],"reminderType":"none","recurrence":null}'::jsonb);
end $$;

-- Member får inte flytta sig till annat hushåll.
do $$ begin
  begin
    update public.profiles set household_id = '92000000-0000-4000-8000-000000000002' where id = auth.uid();
    raise exception 'TEST_FAILED_MEMBER_MOVED_HOUSEHOLD';
  exception when insufficient_privilege then null; end;
  if (select household_id <> '24000000-0000-4000-8000-000000000024' from public.profiles where id = auth.uid()) then raise exception 'TEST_FAILED_HOUSEHOLD_CHANGED'; end if;
end $$;

-- Member måste själv vara deltagare och får inte skapa familjeaktivitet.
do $$ begin
  begin
    perform public.calendar_save_event(null, '{"title":"Otillåten familj","description":"Test","allDay":false,"startsAt":"2026-08-10T08:00:00Z","endsAt":"2026-08-10T09:00:00Z","isFamilyEvent":true,"participantIds":["91000000-0000-4000-8000-000000000002"],"reminderType":"none","recurrence":null}'::jsonb);
    raise exception 'TEST_FAILED_MEMBER_CREATED_FAMILY_EVENT';
  exception when insufficient_privilege then null; end;
end $$;

-- Deltagartabellen kan inte manipuleras direkt.
do $$ begin
  begin
    insert into public.calendar_event_participants (event_id, profile_id, household_id) values ('93000000-0000-4000-8000-000000000001', auth.uid(), '24000000-0000-4000-8000-000000000024');
    raise exception 'TEST_FAILED_DIRECT_PARTICIPANT_INSERT';
  exception when insufficient_privilege or foreign_key_violation then null; end;
end $$;

-- Endast admin kan ändra kategorier.
do $$ begin
  begin
    perform public.calendar_save_category(null, 'Otillåten', 'calendar', '#000000', false);
    raise exception 'TEST_FAILED_MEMBER_CREATED_CATEGORY';
  exception when insufficient_privilege then null; end;
end $$;

-- Member nekas även den administrativa profil-RPC:n.
do $$ begin
  begin
    perform public.admin_update_profile_access(auth.uid(), 'admin', '24000000-0000-4000-8000-000000000024');
    raise exception 'TEST_FAILED_MEMBER_CALLED_ADMIN_PROFILE_RPC';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- Admin kan ändra roll endast för profil som redan finns i samma hushåll.
do $$ begin
  perform public.admin_update_profile_access('91000000-0000-4000-8000-000000000002', 'adult', '24000000-0000-4000-8000-000000000024');
  if (select role <> 'adult' from public.profiles where id = '91000000-0000-4000-8000-000000000002') then
    raise exception 'TEST_FAILED_ADMIN_SAME_HOUSEHOLD_ROLE_CHANGE';
  end if;
  perform public.admin_update_profile_access('91000000-0000-4000-8000-000000000002', 'member', '24000000-0000-4000-8000-000000000024');
end $$;

-- Admin kan inte ansluta en oansluten profil eller ändra profil i annat hushåll.
do $$ begin
  begin
    perform public.admin_update_profile_access('91000000-0000-4000-8000-000000000005', 'member', '24000000-0000-4000-8000-000000000024');
    raise exception 'TEST_FAILED_ADMIN_ATTACHED_UNASSIGNED_PROFILE';
  exception when insufficient_privilege then null; end;
  begin
    perform public.admin_update_profile_access('91000000-0000-4000-8000-000000000003', 'adult', '24000000-0000-4000-8000-000000000024');
    raise exception 'TEST_FAILED_ADMIN_CHANGED_OTHER_HOUSEHOLD';
  exception when insufficient_privilege then null; end;
end $$;

-- En admin utan household_id nekas profil-RPC:n.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
do $$ begin
  begin
    perform public.admin_update_profile_access('91000000-0000-4000-8000-000000000005', 'member', null);
    raise exception 'TEST_FAILED_NULL_HOUSEHOLD_ADMIN_CALLED_PROFILE_RPC';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$ begin
  if (select household_id is not null from public.profiles where id = '91000000-0000-4000-8000-000000000005') then
    raise exception 'TEST_FAILED_UNASSIGNED_PROFILE_WAS_ATTACHED';
  end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- Admin kan skapa kategori och aktivitet för andra i samma hushåll.
do $$ declare category_id uuid; event_id uuid;
begin
  category_id := public.calendar_save_category(null, 'Admintest', 'star', '#123456', false);
  if category_id is null then raise exception 'TEST_FAILED_ADMIN_CATEGORY'; end if;
  event_id := public.calendar_save_event(null, format('{"title":"Adminaktivitet","description":"Test","allDay":false,"startsAt":"2026-08-10T08:00:00Z","endsAt":"2026-08-10T09:00:00Z","isFamilyEvent":false,"participantIds":["91000000-0000-4000-8000-000000000002"],"reminderType":"none","categoryId":"%s","recurrence":null}', category_id)::jsonb);
  if event_id is null then raise exception 'TEST_FAILED_ADMIN_EVENT'; end if;
end $$;

-- Admin kan ändra en aktivitet som skapats av member.
do $$ declare owned_id uuid;
begin
  select id into owned_id from public.calendar_events where title = 'Member uppdaterad';
  perform public.calendar_save_event(owned_id, '{"title":"Admin ändrade member","description":"Test","allDay":false,"startsAt":"2026-08-11T08:00:00Z","endsAt":"2026-08-11T09:00:00Z","isFamilyEvent":false,"participantIds":["91000000-0000-4000-8000-000000000002"],"reminderType":"none","recurrence":null}'::jsonb);
end $$;

-- Databasen nekar datum som inte är en förekomst, datum utanför gränserna och felaktigt prior-antal.
do $$
declare
  event_id uuid;
  count_event_id uuid;
  rejected boolean;
  error_message text;
  split_payload jsonb := jsonb_build_object(
    'title', 'Ska nekas', 'description', 'Test', 'allDay', false,
    'startsAt', '2026-08-14T08:00:00Z', 'endsAt', '2026-08-14T09:00:00Z',
    'isFamilyEvent', false,
    'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none', 'recurrence', null
  );
begin
  event_id := public.calendar_save_event(null, jsonb_build_object(
    'title', 'Valideringsserie', 'description', 'Test', 'allDay', false,
    'startsAt', '2026-08-10T08:00:00Z', 'endsAt', '2026-08-10T09:00:00Z',
    'isFamilyEvent', false,
    'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none',
    'recurrence', jsonb_build_object('frequency', 'daily', 'intervalValue', 2, 'endsOn', '2026-08-20')
  ));

  rejected := false;
  begin
    perform public.calendar_delete_event(event_id, 'future', '2026-08-11');
  exception when invalid_parameter_value then
    get stacked diagnostics error_message = message_text;
    if error_message <> 'CALENDAR_VALIDATION_NOT_AN_OCCURRENCE' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'TEST_FAILED_NON_OCCURRENCE_DATE_ACCEPTED'; end if;

  rejected := false;
  begin
    perform public.calendar_split_series(event_id, '2026-08-09', 0, split_payload);
  exception when invalid_parameter_value then
    get stacked diagnostics error_message = message_text;
    if error_message <> 'CALENDAR_VALIDATION_OCCURRENCE_BEFORE_START' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'TEST_FAILED_BEFORE_START_ACCEPTED'; end if;

  rejected := false;
  begin
    perform public.calendar_split_series(event_id, '2026-08-22', 6, split_payload);
  exception when invalid_parameter_value then
    get stacked diagnostics error_message = message_text;
    if error_message <> 'CALENDAR_VALIDATION_OCCURRENCE_AFTER_END' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'TEST_FAILED_AFTER_END_ACCEPTED'; end if;

  rejected := false;
  begin
    perform public.calendar_split_series(event_id, '2026-08-14', 1, split_payload);
  exception when invalid_parameter_value then
    get stacked diagnostics error_message = message_text;
    if error_message <> 'CALENDAR_VALIDATION_PRIOR_OCCURRENCE_COUNT' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'TEST_FAILED_WRONG_PRIOR_COUNT_ACCEPTED'; end if;

  count_event_id := public.calendar_save_event(null, jsonb_build_object(
    'title', 'Count-valideringsserie', 'description', 'Test', 'allDay', false,
    'startsAt', '2026-09-01T08:00:00Z', 'endsAt', '2026-09-01T09:00:00Z',
    'isFamilyEvent', false,
    'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none',
    'recurrence', jsonb_build_object('frequency', 'daily', 'intervalValue', 1, 'occurrenceCount', 3)
  ));
  rejected := false;
  begin
    perform public.calendar_delete_event(count_event_id, 'future', '2026-09-04');
  exception when invalid_parameter_value then
    get stacked diagnostics error_message = message_text;
    if error_message <> 'CALENDAR_VALIDATION_OCCURRENCE_AFTER_COUNT' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'TEST_FAILED_AFTER_OCCURRENCE_COUNT_ACCEPTED'; end if;
end $$;

-- Giltig daglig split; efterföljaren överlever när ursprungsserien tas bort.
do $$
declare event_id uuid; new_event_id uuid; old_series_id uuid; new_series_id uuid;
begin
  event_id := public.calendar_save_event(null, jsonb_build_object(
    'title', 'Daglig serie', 'description', 'Test', 'allDay', false,
    'startsAt', '2026-10-01T08:00:00Z', 'endsAt', '2026-10-01T09:00:00Z',
    'isFamilyEvent', false, 'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none', 'recurrence', jsonb_build_object('frequency', 'daily', 'intervalValue', 1, 'endsOn', '2026-10-10')
  ));
  select recurrence_series_id into old_series_id from public.calendar_events where id = event_id;
  new_event_id := public.calendar_split_series(event_id, '2026-10-03', 2, jsonb_build_object(
    'title', 'Daglig efterföljare', 'description', 'Test', 'allDay', false,
    'startsAt', '2026-10-03T08:00:00Z', 'endsAt', '2026-10-03T09:00:00Z',
    'isFamilyEvent', false, 'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none', 'recurrence', null
  ));
  select recurrence_series_id into new_series_id from public.calendar_events where id = new_event_id;
  if not exists (select 1 from public.calendar_recurrence_series where id = old_series_id and ends_on = '2026-10-02') then
    raise exception 'TEST_FAILED_DAILY_SPLIT_ORIGINAL';
  end if;
  if not exists (select 1 from public.calendar_recurrence_series where id = new_series_id and starts_on = '2026-10-03' and parent_series_id = old_series_id) then
    raise exception 'TEST_FAILED_DAILY_SPLIT_SUCCESSOR';
  end if;
  perform public.calendar_delete_event(event_id, 'series', null);
  if exists (select 1 from public.calendar_recurrence_series where id = old_series_id) then
    raise exception 'TEST_FAILED_ORIGINAL_SERIES_NOT_DELETED';
  end if;
  if not exists (select 1 from public.calendar_events where id = new_event_id) or
     not exists (select 1 from public.calendar_recurrence_series where id = new_series_id and parent_series_id is null) then
    raise exception 'TEST_FAILED_SUCCESSOR_REMOVED_WITH_PARENT';
  end if;
end $$;

-- Giltig veckovis split respekterar veckointervall och beräknar två tidigare förekomster.
do $$
declare event_id uuid; new_event_id uuid; old_series_id uuid; new_series_id uuid;
begin
  event_id := public.calendar_save_event(null, jsonb_build_object(
    'title', 'Veckoserie', 'description', 'Test', 'allDay', false,
    'startsAt', '2026-11-02T08:00:00Z', 'endsAt', '2026-11-02T09:00:00Z',
    'isFamilyEvent', false, 'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none', 'recurrence', jsonb_build_object('frequency', 'weekly', 'intervalValue', 1, 'endsOn', '2026-12-31')
  ));
  select recurrence_series_id into old_series_id from public.calendar_events where id = event_id;
  new_event_id := public.calendar_split_series(event_id, '2026-11-16', 2, jsonb_build_object(
    'title', 'Veckoefterföljare', 'description', 'Test', 'allDay', false,
    'startsAt', '2026-11-16T08:00:00Z', 'endsAt', '2026-11-16T09:00:00Z',
    'isFamilyEvent', false, 'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none', 'recurrence', null
  ));
  select recurrence_series_id into new_series_id from public.calendar_events where id = new_event_id;
  if not exists (select 1 from public.calendar_recurrence_series where id = old_series_id and ends_on = '2026-11-15') or
     not exists (select 1 from public.calendar_recurrence_series where id = new_series_id and starts_on = '2026-11-16' and parent_series_id = old_series_id) then
    raise exception 'TEST_FAILED_WEEKLY_SPLIT';
  end if;
end $$;

-- Giltig månatlig split räknas genom samma månadsteg som serien använder.
do $$
declare event_id uuid; new_event_id uuid; old_series_id uuid; new_series_id uuid;
begin
  event_id := public.calendar_save_event(null, jsonb_build_object(
    'title', 'Månadsserie', 'description', 'Test', 'allDay', false,
    'startsAt', '2026-01-10T08:00:00Z', 'endsAt', '2026-01-10T09:00:00Z',
    'isFamilyEvent', false, 'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none', 'recurrence', jsonb_build_object('frequency', 'monthly', 'intervalValue', 1, 'endsOn', '2026-12-31')
  ));
  select recurrence_series_id into old_series_id from public.calendar_events where id = event_id;
  new_event_id := public.calendar_split_series(event_id, '2026-03-10', 2, jsonb_build_object(
    'title', 'Månadsefterföljare', 'description', 'Test', 'allDay', false,
    'startsAt', '2026-03-10T08:00:00Z', 'endsAt', '2026-03-10T09:00:00Z',
    'isFamilyEvent', false, 'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none', 'recurrence', null
  ));
  select recurrence_series_id into new_series_id from public.calendar_events where id = new_event_id;
  if not exists (select 1 from public.calendar_recurrence_series where id = old_series_id and ends_on = '2026-03-09') or
     not exists (select 1 from public.calendar_recurrence_series where id = new_series_id and starts_on = '2026-03-10' and parent_series_id = old_series_id) then
    raise exception 'TEST_FAILED_MONTHLY_SPLIT';
  end if;
end $$;

-- Giltig antalsbegränsad split delar occurrence_count mellan original och efterföljare.
do $$
declare event_id uuid; new_event_id uuid; old_series_id uuid; new_series_id uuid;
begin
  event_id := public.calendar_save_event(null, jsonb_build_object(
    'title', 'Antalsserie', 'description', 'Test', 'allDay', false,
    'startsAt', '2027-01-01T08:00:00Z', 'endsAt', '2027-01-01T09:00:00Z',
    'isFamilyEvent', false, 'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none', 'recurrence', jsonb_build_object('frequency', 'daily', 'intervalValue', 1, 'occurrenceCount', 5)
  ));
  select recurrence_series_id into old_series_id from public.calendar_events where id = event_id;
  new_event_id := public.calendar_split_series(event_id, '2027-01-04', 3, jsonb_build_object(
    'title', 'Antalsefterföljare', 'description', 'Test', 'allDay', false,
    'startsAt', '2027-01-04T08:00:00Z', 'endsAt', '2027-01-04T09:00:00Z',
    'isFamilyEvent', false, 'participantIds', jsonb_build_array('91000000-0000-4000-8000-000000000002'),
    'reminderType', 'none', 'recurrence', null
  ));
  select recurrence_series_id into new_series_id from public.calendar_events where id = new_event_id;
  if not exists (select 1 from public.calendar_recurrence_series where id = old_series_id and occurrence_count = 3 and ends_on is null) or
     not exists (select 1 from public.calendar_recurrence_series where id = new_series_id and occurrence_count = 2 and starts_on = '2027-01-04' and parent_series_id = old_series_id) then
    raise exception 'TEST_FAILED_COUNT_LIMITED_SPLIT';
  end if;
end $$;

-- Member kan läsa men inte ändra admins aktivitet.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ declare admin_event uuid;
begin
  select id into admin_event from public.calendar_events where title = 'Adminaktivitet';
  begin
    perform public.calendar_save_event(admin_event, '{"title":"Otillåten ändring","description":"Test","allDay":false,"startsAt":"2026-08-10T08:00:00Z","endsAt":"2026-08-10T09:00:00Z","isFamilyEvent":false,"participantIds":["91000000-0000-4000-8000-000000000002"],"reminderType":"none","recurrence":null}'::jsonb);
    raise exception 'TEST_FAILED_MEMBER_CHANGED_ADMIN_EVENT';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
rollback;
