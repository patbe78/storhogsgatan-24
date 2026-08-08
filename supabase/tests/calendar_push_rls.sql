-- Kör endast mot lokal/test-Supabase efter Sprint 4C-migrationerna. All testdata rullas tillbaka.
begin;

-- Grants ska vara säkra även när Supabase har breda default grants för nya tabeller.
do $$
declare
  v_column text;
  v_table text;
  v_role text;
  v_privilege text;
begin
  if has_table_privilege('anon', 'public.push_subscriptions', 'SELECT')
     or has_any_column_privilege('anon', 'public.push_subscriptions', 'SELECT') then
    raise exception 'TEST_FAILED_ANON_PUSH_SELECT';
  end if;
  if has_table_privilege('authenticated', 'public.push_subscriptions', 'SELECT') then
    raise exception 'TEST_FAILED_AUTHENTICATED_TABLE_LEVEL_PUSH_SELECT';
  end if;
  foreach v_column in array array['installation_id', 'binding_id', 'status'] loop
    if not has_column_privilege(
      'authenticated', 'public.push_subscriptions', v_column, 'SELECT'
    ) then raise exception 'TEST_FAILED_SAFE_PUSH_COLUMN_NOT_READABLE: %', v_column; end if;
  end loop;
  foreach v_column in array array[
    'id', 'profile_id', 'household_id', 'auth_session_id', 'endpoint', 'p256dh',
    'auth_secret', 'browser_metadata', 'invalidated_at', 'created_at', 'updated_at'
  ] loop
    if has_column_privilege(
      'authenticated', 'public.push_subscriptions', v_column, 'SELECT'
    ) then raise exception 'TEST_FAILED_SENSITIVE_PUSH_COLUMN_READABLE: %', v_column; end if;
  end loop;

  if has_any_column_privilege('anon', 'public.calendar_event_reminders', 'SELECT') then
    raise exception 'TEST_FAILED_ANON_REMINDER_SELECT';
  end if;
  if not has_table_privilege(
    'authenticated', 'public.calendar_event_reminders', 'SELECT'
  ) then raise exception 'TEST_FAILED_AUTHENTICATED_REMINDER_SELECT'; end if;

  foreach v_table in array array[
    'calendar_event_reminders', 'push_subscriptions',
    'calendar_push_deliveries', 'calendar_push_dispatch_state'
  ] loop
    foreach v_role in array array['anon', 'authenticated'] loop
      foreach v_privilege in array array[
        'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
      ] loop
        if has_table_privilege(v_role, 'public.' || v_table, v_privilege) then
          raise exception 'TEST_FAILED_CLIENT_TABLE_MUTATION: %.% %',
            v_role, v_table, v_privilege;
        end if;
      end loop;
    end loop;
  end loop;

  foreach v_table in array array[
    'calendar_push_deliveries', 'calendar_push_dispatch_state'
  ] loop
    foreach v_role in array array['anon', 'authenticated'] loop
      if has_any_column_privilege(v_role, 'public.' || v_table, 'SELECT') then
        raise exception 'TEST_FAILED_SERVER_TABLE_SELECT: %.%', v_role, v_table;
      end if;
    end loop;
  end loop;

  foreach v_table in array array[
    'calendar_event_reminders', 'push_subscriptions',
    'calendar_push_deliveries', 'calendar_push_dispatch_state'
  ] loop
    foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      if not has_table_privilege('service_role', 'public.' || v_table, v_privilege) then
        raise exception 'TEST_FAILED_SERVICE_ROLE_ACCESS: % %', v_table, v_privilege;
      end if;
    end loop;
  end loop;
end $$;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('c1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'push-one@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('c1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'push-two@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('c1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'push-other@test.invalid', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.households (id, slug, name)
values ('c2000000-0000-4000-8000-000000000002', 'push-test-other', 'Annat pushhushåll')
on conflict do nothing;

update public.profiles set name = 'Push ett', role = 'admin', is_active = true,
  household_id = '24000000-0000-4000-8000-000000000024'
where id = 'c1000000-0000-4000-8000-000000000001';
update public.profiles set name = 'Push två', role = 'member', is_active = true,
  household_id = '24000000-0000-4000-8000-000000000024'
where id = 'c1000000-0000-4000-8000-000000000002';
update public.profiles set name = 'Push annan', role = 'admin', is_active = true,
  household_id = 'c2000000-0000-4000-8000-000000000002'
where id = 'c1000000-0000-4000-8000-000000000003';

-- auth.sessions har id/user_id som dokumenterad korrelation till JWT-claimen session_id.
insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('c3000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', now(), now()),
  ('c3000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', now(), now()),
  ('c3000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000003', now(), now())
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"c3000000-0000-4000-8000-000000000001"}',
  true
);

select public.push_register_subscription(
  'c4000000-0000-4000-8000-000000000001',
  'c5000000-0000-4000-8000-000000000001',
  'https://push.test/shared-endpoint-000000000001',
  repeat('p', 65), repeat('a', 22),
  '{"browser":"test"}'::jsonb
);

do $$ begin
  if (select count(installation_id) <> 1 from public.push_subscriptions) then
    raise exception 'TEST_FAILED_OWNER_CANNOT_READ_SUBSCRIPTION';
  end if;
  perform installation_id, binding_id, status from public.push_subscriptions limit 1;
end $$;
do $$
declare
  v_column text;
begin
  foreach v_column in array array[
    'auth_session_id', 'endpoint', 'p256dh', 'auth_secret', 'browser_metadata'
  ] loop
    begin
      execute format('select %I from public.push_subscriptions limit 1', v_column);
      raise exception 'TEST_FAILED_PUSH_SECRET_EXPOSED: %', v_column;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
do $$ begin
  begin
    insert into public.push_subscriptions (
      profile_id, household_id, installation_id, binding_id, auth_session_id,
      endpoint, p256dh, auth_secret
    ) values (
      auth.uid(), public.current_household_id(), gen_random_uuid(), gen_random_uuid(),
      'c3000000-0000-4000-8000-000000000001', 'https://push.test/direct-write-blocked',
      repeat('p', 65), repeat('a', 22)
    );
    raise exception 'TEST_FAILED_DIRECT_SUBSCRIPTION_INSERT';
  exception when insufficient_privilege then null; end;
end $$;

-- Samma browser-endpoint och installation överförs atomärt till nästa inloggade användare.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"c3000000-0000-4000-8000-000000000002"}',
  true
);
select public.push_register_subscription(
  'c4000000-0000-4000-8000-000000000001',
  'c5000000-0000-4000-8000-000000000002',
  'https://push.test/shared-endpoint-000000000001',
  repeat('q', 65), repeat('b', 22),
  '{"browser":"shared-device"}'::jsonb
);

do $$ begin
  if not exists (
    select 1 from public.push_subscriptions
    where installation_id = 'c4000000-0000-4000-8000-000000000001'
      and binding_id = 'c5000000-0000-4000-8000-000000000002'
      and status = 'active'
  ) then raise exception 'TEST_FAILED_ATOMIC_REBIND'; end if;
end $$;

reset role;
do $$ begin
  if not exists (
    select 1 from public.push_subscriptions
    where installation_id = 'c4000000-0000-4000-8000-000000000001'
      and auth_session_id = 'c3000000-0000-4000-8000-000000000002'
  ) then raise exception 'TEST_FAILED_AUTH_SESSION_REBIND'; end if;
end $$;

-- Annat hushåll kan varken se eller avaktivera den delade installationen.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated","session_id":"c3000000-0000-4000-8000-000000000003"}',
  true
);
do $$ begin
  if (select count(installation_id) <> 0 from public.push_subscriptions) then
    raise exception 'TEST_FAILED_HOUSEHOLD_SUBSCRIPTION_LEAK';
  end if;
  perform public.push_deactivate_installation('c4000000-0000-4000-8000-000000000001');
end $$;

reset role;
do $$ begin
  if not exists (
    select 1 from public.push_subscriptions
    where installation_id = 'c4000000-0000-4000-8000-000000000001' and status = 'active'
  ) then raise exception 'TEST_FAILED_FOREIGN_DEACTIVATION'; end if;
end $$;

rollback;
