-- KÖR ENDAST mot lokal eller separat test-Supabase efter Sprint 4B-migrationerna.
-- All testdata återställs av transaktionen.
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('93000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'family-admin-one@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('93000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'family-admin-two@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('93000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'family-member@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('93000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'family-other@test.invalid', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.households (id, slug, name)
values ('94000000-0000-4000-8000-000000000004', 'family-test-other', 'Annat familjetest')
on conflict do nothing;

update public.profiles set name = 'Admin ett', role = 'admin', household_id = '24000000-0000-4000-8000-000000000024' where id = '93000000-0000-4000-8000-000000000001';
update public.profiles set name = 'Admin två', role = 'admin', household_id = '24000000-0000-4000-8000-000000000024' where id = '93000000-0000-4000-8000-000000000002';
update public.profiles set name = 'Medlem', role = 'member', household_id = '24000000-0000-4000-8000-000000000024' where id = '93000000-0000-4000-8000-000000000003';
update public.profiles set name = 'Annan', role = 'admin', household_id = '94000000-0000-4000-8000-000000000004' where id = '93000000-0000-4000-8000-000000000004';

insert into public.family_invitations (household_id, email, invited_name, role, profile_color, invited_by, token_hash, expires_at)
values ('24000000-0000-4000-8000-000000000024', 'invite@test.invalid', 'Inbjuden', 'member', '#112233', '93000000-0000-4000-8000-000000000001', repeat('a', 64), now() + interval '7 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"93000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$ begin
  begin update public.profiles set role = 'admin' where id = auth.uid(); raise exception 'TEST_FAILED_DIRECT_ROLE'; exception when insufficient_privilege then null; end;
  begin update public.profiles set household_id = '94000000-0000-4000-8000-000000000004' where id = auth.uid(); raise exception 'TEST_FAILED_DIRECT_HOUSEHOLD'; exception when insufficient_privilege then null; end;
  begin update public.profiles set is_active = false, deactivated_at = now(), deactivated_by = auth.uid() where id = auth.uid(); raise exception 'TEST_FAILED_DIRECT_ACTIVE'; exception when insufficient_privilege then null; end;
  begin insert into public.family_audit_log (household_id, actor_profile_id, action) values ('24000000-0000-4000-8000-000000000024', auth.uid(), 'role_changed'); raise exception 'TEST_FAILED_DIRECT_AUDIT'; exception when insufficient_privilege then null; end;
  begin insert into public.family_invitations (household_id, email, invited_name, role, profile_color, invited_by, token_hash, expires_at) values ('24000000-0000-4000-8000-000000000024', 'attack@test.invalid', 'Attack', 'member', '#112233', auth.uid(), repeat('b', 64), now() + interval '7 days'); raise exception 'TEST_FAILED_DIRECT_INVITE'; exception when insufficient_privilege then null; end;
  begin perform public.family_update_member_role(auth.uid(), 'admin'); raise exception 'TEST_FAILED_MEMBER_ROLE_RPC'; exception when insufficient_privilege then null; end;
  begin perform public.family_create_invitation_internal(auth.uid(), 'attack@test.invalid', 'Attack', 'member', '#112233', repeat('b', 64)); raise exception 'TEST_FAILED_INTERNAL_RPC'; exception when insufficient_privilege then null; end;
  if exists (select 1 from public.family_invitations) then raise exception 'TEST_FAILED_MEMBER_READ_INVITES'; end if;
  if exists (select 1 from public.family_audit_log) then raise exception 'TEST_FAILED_MEMBER_READ_AUDIT'; end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$ begin
  if (select count(*) from public.family_list_members()) <> 3 then raise exception 'TEST_FAILED_ADMIN_MEMBER_LIST'; end if;
  begin perform public.family_update_member_role('93000000-0000-4000-8000-000000000004', 'member'); raise exception 'TEST_FAILED_OTHER_HOUSEHOLD'; exception when insufficient_privilege then null; end;
  begin perform token_hash from public.family_invitations limit 1; raise exception 'TEST_FAILED_TOKEN_HASH_READ'; exception when insufficient_privilege then null; end;
end $$;

select public.family_update_member_role('93000000-0000-4000-8000-000000000002', 'adult');
do $$
declare rejected boolean := false; error_message text;
begin
  begin
    perform public.family_update_member_role('93000000-0000-4000-8000-000000000001', 'adult');
  exception when check_violation then
    get stacked diagnostics error_message = message_text;
    rejected := error_message = 'FAMILY_LAST_ADMIN';
  end;
  if not rejected then raise exception 'TEST_FAILED_LAST_ADMIN'; end if;
end $$;

reset role;
update public.profiles
set is_active = false, deactivated_at = now(), deactivated_by = '93000000-0000-4000-8000-000000000001'
where id = '93000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000003', true);
do $$ begin
  begin
    perform public.calendar_save_event(null, '{"title":"Attack","description":"","allDay":false,"startsAt":"2026-08-10T08:00:00Z","endsAt":"2026-08-10T09:00:00Z","isFamilyEvent":false,"participantIds":["93000000-0000-4000-8000-000000000003"],"reminderType":"none","recurrence":null}'::jsonb);
    raise exception 'TEST_FAILED_INACTIVE_CALENDAR';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
rollback;
