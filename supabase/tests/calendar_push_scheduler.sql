-- Kör endast mot lokal/test-Supabase efter Sprint 4C-migrationerna. All testdata rullas tillbaka.
begin;

-- The correction migration gives the existing deduplication constraint and
-- its backing unique index a stable name without changing its columns.
do $$ begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_record
    join pg_catalog.pg_class constraint_index
      on constraint_index.oid = constraint_record.conindid
    where constraint_record.conrelid = 'public.calendar_push_deliveries'::regclass
      and constraint_record.conname = 'calendar_push_deliveries_dedup_key'
      and constraint_record.contype = 'u'
      and constraint_index.relname = 'calendar_push_deliveries_dedup_key'
      and array(
        select attribute.attname::text
        from unnest(constraint_record.conkey) with ordinality as key_column(attnum, position)
        join pg_catalog.pg_attribute attribute
          on attribute.attrelid = constraint_record.conrelid
          and attribute.attnum = key_column.attnum
        order by key_column.position
      ) = array[
        'reminder_id',
        'occurrence_starts_at',
        'profile_id',
        'subscription_id'
      ]
  ) then raise exception 'TEST_FAILED_DELIVERY_DEDUP_CONSTRAINT'; end if;
end $$;

-- An empty claim still parses and executes every PL/pgSQL statement, so this
-- catches output/column ambiguities even before candidate data exists.
update public.calendar_push_dispatch_state
set last_scanned_at = '2025-12-31T21:59:00Z';
create temporary table empty_claim as
select * from public.calendar_claim_due_push_deliveries('2025-12-31T22:00:00Z');
do $$ begin
  if (select count(*) <> 0 from empty_claim) then
    raise exception 'TEST_FAILED_EMPTY_CLAIM';
  end if;
end $$;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('d1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'scheduler@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('d1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'scheduler-other@test.invalid', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;
update public.profiles set name = 'Scheduler', role = 'admin', is_active = true,
  household_id = '24000000-0000-4000-8000-000000000024'
where id = 'd1000000-0000-4000-8000-000000000001';
update public.profiles set name = 'Icke deltagare', role = 'member', is_active = true,
  household_id = '24000000-0000-4000-8000-000000000024'
where id = 'd1000000-0000-4000-8000-000000000002';
insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('d3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', now(), now()),
  ('d3000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', now(), now())
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"d3000000-0000-4000-8000-000000000001"}',
  true
);
select public.push_register_subscription(
  'd4000000-0000-4000-8000-000000000001',
  'd5000000-0000-4000-8000-000000000001',
  'https://push.test/scheduler-device-one', repeat('p', 65), repeat('a', 22), '{}'
);
select public.push_register_subscription(
  'd4000000-0000-4000-8000-000000000002',
  'd5000000-0000-4000-8000-000000000002',
  'https://push.test/scheduler-device-two', repeat('q', 65), repeat('b', 22), '{}'
);

-- Två reminders sparas atomärt; samma offset avvisas.
create temporary table reminder_event as
select public.calendar_save_event(
  null,
  '{"title":"Två reminders","description":"Hemlig beskrivning","allDay":false,"startsAt":"2026-03-29T07:15:00Z","endsAt":"2026-03-29T08:15:00Z","isFamilyEvent":false,"participantIds":["d1000000-0000-4000-8000-000000000001"],"reminderOffsetsMinutes":[5,15],"recurrence":null}'::jsonb
) as id;
do $$ begin
  if (select count(*) <> 2 from public.calendar_event_reminders where event_id = (select id from reminder_event)) then
    raise exception 'TEST_FAILED_MULTIPLE_REMINDERS';
  end if;
  begin
    perform public.calendar_save_event(
      (select id from reminder_event),
      '{"title":"Dublett","description":"","allDay":false,"startsAt":"2026-03-29T07:15:00Z","endsAt":"2026-03-29T08:15:00Z","isFamilyEvent":false,"participantIds":["d1000000-0000-4000-8000-000000000001"],"reminderOffsetsMinutes":[15,15],"recurrence":null}'::jsonb
    );
    raise exception 'TEST_FAILED_DUPLICATE_REMINDER_ACCEPTED';
  exception when invalid_parameter_value then null; end;
end $$;

-- Slutdatum och occurrence count begränsar backendens genererade förekomster.
create temporary table recurrence_count_event as
select public.calendar_save_event(
  null,
  '{"title":"Count-kontrakt","description":"","allDay":false,"startsAt":"2026-01-01T07:00:00Z","endsAt":"2026-01-01T08:00:00Z","isFamilyEvent":false,"participantIds":["d1000000-0000-4000-8000-000000000001"],"reminderOffsetsMinutes":[0],"recurrence":{"frequency":"daily","intervalValue":1,"occurrenceCount":2}}'::jsonb
) as id;
create temporary table recurrence_end_event as
select public.calendar_save_event(
  null,
  '{"title":"Slutdatumkontrakt","description":"","allDay":false,"startsAt":"2026-01-01T07:00:00Z","endsAt":"2026-01-01T08:00:00Z","isFamilyEvent":false,"participantIds":["d1000000-0000-4000-8000-000000000001"],"reminderOffsetsMinutes":[0],"recurrence":{"frequency":"daily","intervalValue":1,"endsOn":"2026-01-02"}}'::jsonb
) as id;
reset role;
do $$ begin
  if (
    select count(*) from public.calendar_due_reminder_occurrences(
      '2025-12-31T23:00:00Z', '2026-01-04T23:00:00Z'
    ) where event_id = (select id from recurrence_count_event)
  ) <> 2 then raise exception 'TEST_FAILED_OCCURRENCE_COUNT'; end if;
  if (
    select count(*) from public.calendar_due_reminder_occurrences(
      '2025-12-31T23:00:00Z', '2026-01-04T23:00:00Z'
    ) where event_id = (select id from recurrence_end_event)
  ) <> 2 then raise exception 'TEST_FAILED_RECURRENCE_END_DATE'; end if;
end $$;

reset role;
update public.calendar_push_dispatch_state set last_scanned_at = '2026-03-29T06:59:00Z';

-- Båda enheterna claimas, occurrence returneras entydigt, icke-deltagaren
-- exkluderas och upprepad körning skapar ingen dublett.
create temporary table first_claim as
select * from public.calendar_claim_due_push_deliveries('2026-03-29T07:00:00Z');
do $$ begin
  if (select count(*) <> 2 from first_claim) then
    raise exception 'TEST_FAILED_CANDIDATE_MULTI_DEVICE_CLAIM';
  end if;
  if exists (
    select 1 from first_claim
    where occurrence_starts_at <> '2026-03-29T07:15:00Z'::timestamptz
  ) then raise exception 'TEST_FAILED_OCCURRENCE_STARTS_AT'; end if;
  if exists (select 1 from first_claim where title <> 'Två reminders') then
    raise exception 'TEST_FAILED_UNSAFE_TITLE';
  end if;
  if (select count(*) <> 0 from public.calendar_claim_due_push_deliveries('2026-03-29T07:00:00Z')) then
    raise exception 'TEST_FAILED_REPEATED_CLAIM';
  end if;
  if (
    select count(*)
    from public.calendar_push_deliveries delivery
    where delivery.id = any (select claimed.delivery_id from first_claim claimed)
  ) <> 2 then
    raise exception 'TEST_FAILED_REPEATED_CLAIM_DUPLICATE_DELIVERY';
  end if;
  if (
    select count(*)
    from public.calendar_push_deliveries delivery
    where delivery.occurrence_starts_at = '2026-03-29T07:15:00Z'::timestamptz
      and delivery.profile_id = 'd1000000-0000-4000-8000-000000000001'
  ) <> 2 then
    raise exception 'TEST_FAILED_DELIVERY_DEDUPLICATION';
  end if;
end $$;

-- Invalid subscription påverkar endast sin leverans och inaktiveras.
select public.calendar_complete_push_delivery(
  delivery_id, claim_token, 'invalid_subscription', 'push_410'
) from first_claim limit 1;
do $$ begin
  if (select count(*) <> 1 from public.push_subscriptions where status = 'invalid') then
    raise exception 'TEST_FAILED_INVALID_SUBSCRIPTION_NOT_DISABLED';
  end if;
  if (select count(*) <> 1 from public.calendar_push_deliveries where status = 'processing') then
    raise exception 'TEST_FAILED_BROKEN_SUBSCRIPTION_AFFECTED_OTHER';
  end if;
end $$;

-- En borttagen auth.sessions-rad gör en kvarvarande subscription obehörig.
delete from auth.sessions where id = 'd3000000-0000-4000-8000-000000000001';
do $$ begin
  if exists (
    select 1 from first_claim claim
    where public.calendar_confirm_push_delivery(claim.delivery_id, claim.claim_token)
  ) then raise exception 'TEST_FAILED_STALE_AUTH_SESSION_CONFIRMED'; end if;
end $$;

-- Catch-up inom tio minuter skickas; äldre kandidat journalförs som expired.
insert into auth.sessions (id, user_id, created_at, updated_at)
values ('d3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', now(), now());
update public.push_subscriptions set status = 'active', invalidated_at = null
where profile_id = 'd1000000-0000-4000-8000-000000000001';
update public.calendar_push_dispatch_state set last_scanned_at = '2026-03-29T07:00:00Z';

-- Reminder 5 minuter före är fem minuter sen vid 07:15 och ska catchas upp.
create temporary table catch_up_claim as
select * from public.calendar_claim_due_push_deliveries('2026-03-29T07:15:00Z');
do $$ begin
  if (select count(*) <> 2 from catch_up_claim) then raise exception 'TEST_FAILED_CATCH_UP'; end if;
end $$;

-- Mottagaren kontrolleras igen precis före transport: inactive och borttagen deltagare stoppas.
update public.profiles set is_active = false
where id = 'd1000000-0000-4000-8000-000000000001';
do $$ begin
  if exists (
    select 1 from catch_up_claim claim
    where public.calendar_confirm_push_delivery(claim.delivery_id, claim.claim_token)
  ) then raise exception 'TEST_FAILED_INACTIVE_PROFILE_CONFIRMED'; end if;
end $$;
update public.profiles set is_active = true
where id = 'd1000000-0000-4000-8000-000000000001';
delete from public.calendar_event_participants
where event_id = (select id from reminder_event)
  and profile_id = 'd1000000-0000-4000-8000-000000000001';
do $$ begin
  if exists (
    select 1 from catch_up_claim claim
    where public.calendar_confirm_push_delivery(claim.delivery_id, claim.claim_token)
  ) then raise exception 'TEST_FAILED_REMOVED_PARTICIPANT_CONFIRMED'; end if;
end $$;
insert into public.calendar_event_participants (event_id, profile_id, household_id)
values (
  (select id from reminder_event),
  'd1000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000024'
);

-- Funktionskontraktet serialiserar scan-cursorn och använder SKIP LOCKED för
-- kandidatclaimen. Tillsammans med repeated-claim-testet ovan verifierar detta
-- att parallella körningar inte kan returnera samma leverans.
do $$
declare
  v_definition text := pg_get_functiondef(
    'public.calendar_claim_due_push_deliveries(timestamptz)'::regprocedure
  );
begin
  if v_definition !~* 'from[[:space:]]+public\.calendar_push_dispatch_state[[:space:]]+state[[:space:]]+where[[:space:]]+state\.singleton[[:space:]]+for[[:space:]]+update' then
    raise exception 'TEST_FAILED_PARALLEL_DISPATCH_LOCK';
  end if;
  if v_definition !~* 'for[[:space:]]+update[[:space:]]+skip[[:space:]]+locked' then
    raise exception 'TEST_FAILED_PARALLEL_CLAIM_GUARD';
  end if;
end $$;

-- Ett separat gammalt event ger expired, inte utskick.
insert into public.calendar_events (
  id, household_id, title, description, created_by, updated_by, starts_at, ends_at,
  all_day, is_family_event, reminder_type
) values (
  'd6000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000024',
  'För gammal', '', 'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001', '2026-03-29T07:20:00Z', '2026-03-29T08:20:00Z',
  false, false, 'none'
);
insert into public.calendar_event_participants (event_id, profile_id, household_id)
values ('d6000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000024');
insert into public.calendar_event_reminders (event_id, household_id, offset_minutes, created_by)
values ('d6000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000024', 20, 'd1000000-0000-4000-8000-000000000001');
update public.calendar_push_dispatch_state set last_scanned_at = '2026-03-29T06:50:00Z';
create temporary table expired_claim as
select * from public.calendar_claim_due_push_deliveries('2026-03-29T07:15:00Z');
do $$ begin
  if not exists (
    select 1 from public.calendar_push_deliveries
    where event_id = 'd6000000-0000-4000-8000-000000000002' and status = 'expired'
  ) then raise exception 'TEST_FAILED_OLD_REMINDER_NOT_EXPIRED'; end if;
end $$;

-- Återkomstkontrakt: månadsslut samt lokal tid över båda DST-gränserna.
do $$ begin
  if public.calendar_recurrence_date('2026-01-31', 'monthly', 1, 1) <> '2026-02-28' then
    raise exception 'TEST_FAILED_MONTH_END';
  end if;
  if public.calendar_recurrence_date('2026-01-31', 'monthly', 1, 2) <> '2026-03-28' then
    raise exception 'TEST_FAILED_SEQUENTIAL_MONTH_END';
  end if;
  if public.calendar_recurrence_date('2024-02-29', 'yearly', 1, 1) <> '2025-02-28' then
    raise exception 'TEST_FAILED_LEAP_YEAR';
  end if;
  if public.calendar_recurrence_date('2026-01-01', 'daily', 2, 3) <> '2026-01-07' then
    raise exception 'TEST_FAILED_DAILY_INTERVAL';
  end if;
  if public.calendar_recurrence_date('2026-01-01', 'weekly', 2, 3) <> '2026-02-12' then
    raise exception 'TEST_FAILED_WEEKLY_INTERVAL';
  end if;
  if (('2026-03-29'::date::timestamp + time '08:00') at time zone 'Europe/Stockholm') <> '2026-03-29T06:00:00Z' then
    raise exception 'TEST_FAILED_CET_TO_CEST';
  end if;
  if (('2026-10-25'::date::timestamp + time '08:00') at time zone 'Europe/Stockholm') <> '2026-10-25T07:00:00Z' then
    raise exception 'TEST_FAILED_CEST_TO_CET';
  end if;
end $$;

-- Deltagare kan läggas till/tas bort atomärt via calendar_save_event.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"d3000000-0000-4000-8000-000000000001"}',
  true
);
select public.calendar_save_event(
  (select id from reminder_event),
  '{"title":"Deltagartest","description":"","allDay":false,"startsAt":"2026-03-29T07:15:00Z","endsAt":"2026-03-29T08:15:00Z","isFamilyEvent":false,"participantIds":["d1000000-0000-4000-8000-000000000001","d1000000-0000-4000-8000-000000000002"],"reminderOffsetsMinutes":[5],"recurrence":null}'::jsonb
);
do $$ begin
  if not exists (
    select 1 from public.calendar_event_participants
    where event_id = (select id from reminder_event)
      and profile_id = 'd1000000-0000-4000-8000-000000000002'
  ) then raise exception 'TEST_FAILED_PARTICIPANT_ADD'; end if;
end $$;
select public.calendar_save_event(
  (select id from reminder_event),
  '{"title":"Flyttad","description":"","allDay":false,"startsAt":"2026-03-30T09:00:00Z","endsAt":"2026-03-30T10:00:00Z","isFamilyEvent":false,"participantIds":["d1000000-0000-4000-8000-000000000001"],"reminderOffsetsMinutes":[5],"recurrence":null}'::jsonb
);
reset role;
do $$ begin
  if exists (
    select 1 from public.calendar_event_participants
    where event_id = (select id from reminder_event)
      and profile_id = 'd1000000-0000-4000-8000-000000000002'
  ) then raise exception 'TEST_FAILED_PARTICIPANT_REMOVE'; end if;
  if exists (
    select 1 from public.calendar_due_reminder_occurrences(
      '2026-03-29T07:09:00Z', '2026-03-29T07:11:00Z'
    ) where event_id = (select id from reminder_event)
  ) then raise exception 'TEST_FAILED_EVENT_MOVE_OLD_REMINDER'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"d3000000-0000-4000-8000-000000000001"}',
  true
);
select public.calendar_save_event(
  (select id from reminder_event),
  '{"title":"Flyttad","description":"","allDay":false,"startsAt":"2026-03-30T09:00:00Z","endsAt":"2026-03-30T10:00:00Z","isFamilyEvent":false,"participantIds":["d1000000-0000-4000-8000-000000000001"],"reminderOffsetsMinutes":[],"recurrence":null}'::jsonb
);
do $$ begin
  if exists (select 1 from public.calendar_event_reminders where event_id = (select id from reminder_event)) then
    raise exception 'TEST_FAILED_REMINDER_REMOVAL';
  end if;
end $$;
select public.calendar_delete_event((select id from reminder_event), 'series', null);
do $$ begin
  if exists (select 1 from public.calendar_events where id = (select id from reminder_event)) then
    raise exception 'TEST_FAILED_EVENT_DELETE';
  end if;
end $$;

rollback;
