-- Sprint 4B: RLS, least-privilege RPCs and atomic family administration.

create or replace function public.family_is_active_admin(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_uid
      and p.household_id is not null
      and p.role = 'admin'
      and p.is_active
  )
$$;

create or replace function public.family_invitation_status(p_invitation public.family_invitations)
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  select case
    when p_invitation.accepted_at is not null then 'accepted'
    when p_invitation.revoked_at is not null then 'revoked'
    when p_invitation.expires_at <= now() then 'expired'
    when p_invitation.locked_until > now() then 'temporarily_locked'
    when p_invitation.delivery_status = 'failed' then 'delivery_failed'
    else 'pending'
  end
$$;

revoke all on function public.family_is_active_admin(uuid) from public;
revoke all on function public.family_invitation_status(public.family_invitations) from public;
grant execute on function public.family_is_active_admin(uuid) to authenticated;

drop policy if exists "Household members can view calendar profiles" on public.profiles;
create policy "Active admins can view household profiles"
  on public.profiles for select to authenticated
  using (
    public.family_is_active_admin(auth.uid())
    and household_id = (select public.current_household_id())
  );

create policy "Active admins can view household invitations"
  on public.family_invitations for select to authenticated
  using (
    public.family_is_active_admin(auth.uid())
    and household_id = (select public.current_household_id())
  );

create policy "Active admins can view household audit"
  on public.family_audit_log for select to authenticated
  using (
    public.family_is_active_admin(auth.uid())
    and household_id = (select public.current_household_id())
  );

revoke all on public.family_invitations from anon, authenticated;
grant select (
  id, household_id, email, invited_name, role, profile_color, invited_by,
  expires_at, accepted_at, accepted_by, revoked_at, revoked_by,
  delivery_status, last_sent_at, send_count, failed_attempt_count,
  locked_until, created_at, updated_at
) on public.family_invitations to authenticated;

revoke all on public.family_audit_log from anon, authenticated;
grant select on public.family_audit_log to authenticated;

revoke update (color) on public.profiles from authenticated;

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if (
    old.role is distinct from new.role
    or old.household_id is distinct from new.household_id
    or old.color is distinct from new.color
  ) and current_user not in ('postgres', 'service_role') then
    raise exception 'PROFILE_SECURITY_FIELDS_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
before update of role, household_id, color on public.profiles
for each row execute function public.protect_profile_security_fields();

create or replace function public.family_write_audit_internal(
  p_household_id uuid,
  p_actor_profile_id uuid,
  p_target_profile_id uuid,
  p_invitation_id uuid,
  p_action text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_id uuid;
begin
  if p_action not in (
    'invitation_created', 'invitation_delivery_failed', 'invitation_revoked',
    'invitation_accepted', 'role_changed', 'color_changed',
    'member_deactivated', 'member_reactivated'
  ) or jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'FAMILY_AUDIT_INVALID' using errcode = '22023';
  end if;

  insert into public.family_audit_log (
    household_id, actor_profile_id, target_profile_id, invitation_id, action, metadata
  ) values (
    p_household_id, p_actor_profile_id, p_target_profile_id, p_invitation_id,
    p_action, coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.family_list_members()
returns table (
  id uuid,
  name text,
  email text,
  role text,
  color text,
  is_active boolean,
  joined_at timestamptz,
  deactivated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare v_household uuid;
begin
  select p.household_id into v_household
  from public.profiles p
  where p.id = auth.uid() and p.is_active and p.role = 'admin';
  if v_household is null then
    raise exception 'FAMILY_FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select p.id, p.name, lower(coalesce(u.email, p.email)), p.role, p.color,
         p.is_active, p.created_at, p.deactivated_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.household_id = v_household
  order by p.is_active desc, lower(p.name), p.created_at;
end;
$$;

create or replace function public.family_list_invitations()
returns table (
  id uuid,
  invited_name text,
  email text,
  role text,
  profile_color text,
  invited_by_name text,
  created_at timestamptz,
  expires_at timestamptz,
  delivery_status text,
  status text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare v_household uuid;
begin
  select p.household_id into v_household
  from public.profiles p
  where p.id = auth.uid() and p.is_active and p.role = 'admin';
  if v_household is null then
    raise exception 'FAMILY_FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select i.id, i.invited_name, i.email, i.role, i.profile_color,
         inviter.name, i.created_at, i.expires_at, i.delivery_status,
         public.family_invitation_status(i)
  from public.family_invitations i
  join public.profiles inviter on inviter.id = i.invited_by
  where i.household_id = v_household
  order by i.created_at desc;
end;
$$;

create or replace function public.family_list_audit_log(
  p_limit integer default 100,
  p_before timestamptz default null
)
returns table (
  id uuid,
  actor_name text,
  target_name text,
  invitation_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare v_household uuid;
begin
  select p.household_id into v_household
  from public.profiles p
  where p.id = auth.uid() and p.is_active and p.role = 'admin';
  if v_household is null then
    raise exception 'FAMILY_FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select a.id, actor.name, target.name, a.invitation_id, a.action, a.metadata, a.created_at
  from public.family_audit_log a
  left join public.profiles actor on actor.id = a.actor_profile_id
  left join public.profiles target on target.id = a.target_profile_id
  where a.household_id = v_household
    and (p_before is null or a.created_at < p_before)
  order by a.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
end;
$$;

create or replace function public.family_revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_actor public.profiles%rowtype; v_invitation public.family_invitations%rowtype;
begin
  select * into v_actor from public.profiles
  where id = auth.uid() and is_active and role = 'admin';
  if not found or v_actor.household_id is null then
    raise exception 'FAMILY_FORBIDDEN' using errcode = '42501';
  end if;

  perform 1 from public.households where id = v_actor.household_id for update;
  perform 1 from public.profiles p
  where p.id = v_actor.id and p.household_id = v_actor.household_id
    and p.is_active and p.role = 'admin' for update;
  if not found then raise exception 'FAMILY_FORBIDDEN' using errcode = '42501'; end if;
  select * into v_invitation from public.family_invitations
  where id = p_invitation_id and household_id = v_actor.household_id
  for update;
  if not found then raise exception 'FAMILY_FORBIDDEN' using errcode = '42501'; end if;
  if v_invitation.accepted_at is not null or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= now() then
    raise exception 'FAMILY_INVITATION_INVALID' using errcode = '22023';
  end if;

  update public.family_invitations
  set revoked_at = now(), revoked_by = v_actor.id, locked_until = null
  where id = v_invitation.id;
  perform public.family_write_audit_internal(
    v_actor.household_id, v_actor.id, null, v_invitation.id,
    'invitation_revoked', '{}'::jsonb
  );
end;
$$;

create or replace function public.family_update_member_role(p_profile_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_actor public.profiles%rowtype; v_target public.profiles%rowtype; v_admins integer;
begin
  select * into v_actor from public.profiles
  where id = auth.uid() and is_active and role = 'admin';
  if not found or v_actor.household_id is null or p_role not in ('admin', 'adult', 'member', 'guest') then
    raise exception 'FAMILY_FORBIDDEN' using errcode = '42501';
  end if;

  perform 1 from public.households where id = v_actor.household_id for update;
  perform 1 from public.profiles p
  where p.id = v_actor.id and p.household_id = v_actor.household_id
    and p.is_active and p.role = 'admin' for update;
  if not found then raise exception 'FAMILY_FORBIDDEN' using errcode = '42501'; end if;
  select * into v_target from public.profiles
  where id = p_profile_id and household_id = v_actor.household_id for update;
  if not found then raise exception 'FAMILY_FORBIDDEN' using errcode = '42501'; end if;

  if v_target.is_active and v_target.role = 'admin' and p_role <> 'admin' then
    select count(*) into v_admins from public.profiles
    where household_id = v_actor.household_id and is_active and role = 'admin' and id <> v_target.id;
    if v_admins = 0 then
      raise exception 'FAMILY_LAST_ADMIN' using errcode = '23514';
    end if;
  end if;

  if v_target.role is distinct from p_role then
    update public.profiles set role = p_role, updated_at = now() where id = v_target.id;
    perform public.family_write_audit_internal(
      v_actor.household_id, v_actor.id, v_target.id, null, 'role_changed',
      jsonb_build_object('from', v_target.role, 'to', p_role)
    );
  end if;
end;
$$;

create or replace function public.family_update_member_color(p_profile_id uuid, p_color text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_actor public.profiles%rowtype; v_target public.profiles%rowtype; v_color text := upper(btrim(p_color));
begin
  select * into v_actor from public.profiles
  where id = auth.uid() and is_active and role = 'admin';
  if not found or v_actor.household_id is null or v_color !~ '^#[0-9A-F]{6}$' then
    raise exception 'FAMILY_FORBIDDEN' using errcode = '42501';
  end if;
  perform 1 from public.households where id = v_actor.household_id for update;
  perform 1 from public.profiles p
  where p.id = v_actor.id and p.household_id = v_actor.household_id
    and p.is_active and p.role = 'admin' for update;
  if not found then raise exception 'FAMILY_FORBIDDEN' using errcode = '42501'; end if;
  select * into v_target from public.profiles
  where id = p_profile_id and household_id = v_actor.household_id for update;
  if not found then raise exception 'FAMILY_FORBIDDEN' using errcode = '42501'; end if;

  if v_target.color is distinct from v_color then
    update public.profiles set color = v_color, updated_at = now() where id = v_target.id;
    perform public.family_write_audit_internal(
      v_actor.household_id, v_actor.id, v_target.id, null, 'color_changed',
      jsonb_build_object('from', v_target.color, 'to', v_color)
    );
  end if;
end;
$$;

create or replace function public.family_set_member_active(p_profile_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_actor public.profiles%rowtype; v_target public.profiles%rowtype; v_admins integer;
begin
  select * into v_actor from public.profiles
  where id = auth.uid() and is_active and role = 'admin';
  if not found or v_actor.household_id is null or p_is_active is null then
    raise exception 'FAMILY_FORBIDDEN' using errcode = '42501';
  end if;

  perform 1 from public.households where id = v_actor.household_id for update;
  perform 1 from public.profiles p
  where p.id = v_actor.id and p.household_id = v_actor.household_id
    and p.is_active and p.role = 'admin' for update;
  if not found then raise exception 'FAMILY_FORBIDDEN' using errcode = '42501'; end if;
  select * into v_target from public.profiles
  where id = p_profile_id and household_id = v_actor.household_id for update;
  if not found then raise exception 'FAMILY_FORBIDDEN' using errcode = '42501'; end if;

  if v_target.is_active and not p_is_active and v_target.role = 'admin' then
    select count(*) into v_admins from public.profiles
    where household_id = v_actor.household_id and is_active and role = 'admin' and id <> v_target.id;
    if v_admins = 0 then
      raise exception 'FAMILY_LAST_ADMIN' using errcode = '23514';
    end if;
  end if;

  if v_target.is_active is distinct from p_is_active then
    update public.profiles
    set is_active = p_is_active,
        deactivated_at = case when p_is_active then null else now() end,
        deactivated_by = case when p_is_active then null else v_actor.id end,
        updated_at = now()
    where id = v_target.id;
    perform public.family_write_audit_internal(
      v_actor.household_id, v_actor.id, v_target.id, null,
      case when p_is_active then 'member_reactivated' else 'member_deactivated' end,
      '{}'::jsonb
    );
  end if;
end;
$$;

create or replace function public.family_create_invitation_internal(
  p_actor_user_id uuid,
  p_email text,
  p_invited_name text,
  p_role text,
  p_profile_color text,
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_actor public.profiles%rowtype;
  v_email text := lower(btrim(p_email));
  v_name text := btrim(p_invited_name);
  v_color text := upper(btrim(p_profile_color));
  v_id uuid;
begin
  select * into v_actor from public.profiles
  where id = p_actor_user_id and is_active and role = 'admin';
  if not found or v_actor.household_id is null then
    raise exception 'FAMILY_FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(v_name) not between 1 and 100
     or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or p_role not in ('adult', 'member')
     or v_color !~ '^#[0-9A-F]{6}$'
     or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'FAMILY_VALIDATION' using errcode = '22023';
  end if;

  perform 1 from public.households where id = v_actor.household_id for update;
  perform 1 from public.profiles p
  where p.id = v_actor.id and p.household_id = v_actor.household_id
    and p.is_active and p.role = 'admin' for update;
  if not found then raise exception 'FAMILY_FORBIDDEN' using errcode = '42501'; end if;
  if exists (
    select 1 from public.profiles p
    left join auth.users u on u.id = p.id
    where p.household_id = v_actor.household_id and p.is_active
      and lower(btrim(coalesce(u.email, p.email))) = v_email
  ) then
    raise exception 'FAMILY_MEMBER_EXISTS' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.family_invitations i
    where i.household_id = v_actor.household_id and i.email = v_email
      and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
  ) then
    raise exception 'FAMILY_INVITATION_EXISTS' using errcode = '23505';
  end if;
  if (
    select count(*) from public.family_invitations i
    where i.invited_by = v_actor.id and i.household_id = v_actor.household_id
      and i.created_at >= now() - interval '1 hour'
  ) >= 10 then
    raise exception 'FAMILY_RATE_LIMIT' using errcode = '54000';
  end if;
  if (
    select count(*) from public.family_invitations i
    where i.household_id = v_actor.household_id and i.email = v_email
      and i.created_at >= now() - interval '24 hours'
  ) >= 3 then
    raise exception 'FAMILY_RATE_LIMIT' using errcode = '54000';
  end if;

  insert into public.family_invitations (
    household_id, email, invited_name, role, profile_color, invited_by,
    token_hash, expires_at
  ) values (
    v_actor.household_id, v_email, v_name, p_role, v_color, v_actor.id,
    p_token_hash, now() + interval '7 days'
  ) returning id into v_id;
  perform public.family_write_audit_internal(
    v_actor.household_id, v_actor.id, null, v_id, 'invitation_created',
    jsonb_build_object('role', p_role, 'profileColor', v_color)
  );
  return v_id;
end;
$$;

create or replace function public.family_mark_invitation_delivery_internal(
  p_invitation_id uuid,
  p_succeeded boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_invitation public.family_invitations%rowtype;
begin
  select * into v_invitation from public.family_invitations
  where id = p_invitation_id for update;
  if not found then raise exception 'FAMILY_INVITATION_INVALID' using errcode = '22023'; end if;

  update public.family_invitations
  set delivery_status = case when p_succeeded then 'sent' else 'failed' end,
      last_sent_at = now(), send_count = send_count + 1
  where id = v_invitation.id;
  if not p_succeeded then
    perform public.family_write_audit_internal(
      v_invitation.household_id, v_invitation.invited_by, null,
      v_invitation.id, 'invitation_delivery_failed', '{}'::jsonb
    );
  end if;
end;
$$;

create or replace function public.family_get_invitation_preview_internal(p_token_hash text)
returns table (
  invitation_id uuid,
  invited_name text,
  email text,
  role text,
  profile_color text,
  household_name text,
  expires_at timestamptz,
  account_exists boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare v_invitation public.family_invitations%rowtype;
begin
  select * into v_invitation from public.family_invitations i
  where i.token_hash = p_token_hash;
  if not found or v_invitation.accepted_at is not null or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= now() or v_invitation.locked_until > now() then
    raise exception 'FAMILY_INVITATION_INVALID' using errcode = '22023';
  end if;

  return query
  select v_invitation.id, v_invitation.invited_name, v_invitation.email,
         v_invitation.role, v_invitation.profile_color, h.name,
         v_invitation.expires_at,
         exists (select 1 from auth.users u where lower(u.email) = v_invitation.email)
  from public.households h where h.id = v_invitation.household_id;
end;
$$;

create or replace function public.family_register_accept_failure_internal(p_token_hash text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_invitation public.family_invitations%rowtype; v_attempts integer;
begin
  select * into v_invitation from public.family_invitations i
  where i.token_hash = p_token_hash for update;
  if not found or v_invitation.accepted_at is not null or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= now() or v_invitation.locked_until > now() then
    return;
  end if;

  v_attempts := case
    when v_invitation.locked_until is not null and v_invitation.locked_until <= now() then 1
    else v_invitation.failed_attempt_count + 1
  end;
  update public.family_invitations
  set failed_attempt_count = v_attempts,
      locked_until = case when v_attempts >= 5 then now() + interval '15 minutes' else null end
  where id = v_invitation.id;
end;
$$;

create or replace function public.family_accept_invitation_internal(
  p_token_hash text,
  p_auth_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_invitation public.family_invitations%rowtype;
  v_profile public.profiles%rowtype;
  v_email text;
begin
  select * into v_invitation from public.family_invitations i
  where i.token_hash = p_token_hash for update;
  if not found or v_invitation.accepted_at is not null or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= now() or v_invitation.locked_until > now() then
    raise exception 'FAMILY_INVITATION_INVALID' using errcode = '22023';
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = p_auth_user_id;
  if v_email is null or v_email <> v_invitation.email then
    raise exception 'FAMILY_INVITATION_INVALID' using errcode = '22023';
  end if;

  insert into public.profiles (id, name, email, role)
  values (p_auth_user_id, '', v_email, 'member')
  on conflict (id) do nothing;
  select * into v_profile from public.profiles p where p.id = p_auth_user_id for update;
  if not found or not v_profile.is_active or v_profile.household_id is not null then
    raise exception 'FAMILY_INVITATION_INVALID' using errcode = '22023';
  end if;

  update public.profiles
  set name = v_invitation.invited_name,
      email = v_email,
      role = v_invitation.role,
      color = v_invitation.profile_color,
      household_id = v_invitation.household_id,
      updated_at = now()
  where id = p_auth_user_id;
  update public.family_invitations
  set accepted_at = now(), accepted_by = p_auth_user_id,
      failed_attempt_count = 0, locked_until = null
  where id = v_invitation.id;
  perform public.family_write_audit_internal(
    v_invitation.household_id, p_auth_user_id, p_auth_user_id,
    v_invitation.id, 'invitation_accepted',
    jsonb_build_object('role', v_invitation.role, 'profileColor', v_invitation.profile_color)
  );
end;
$$;

revoke all on function public.family_write_audit_internal(uuid, uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.family_create_invitation_internal(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.family_mark_invitation_delivery_internal(uuid, boolean) from public, anon, authenticated;
revoke all on function public.family_get_invitation_preview_internal(text) from public, anon, authenticated;
revoke all on function public.family_register_accept_failure_internal(text) from public, anon, authenticated;
revoke all on function public.family_accept_invitation_internal(text, uuid) from public, anon, authenticated;

grant execute on function public.family_write_audit_internal(uuid, uuid, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.family_create_invitation_internal(uuid, text, text, text, text, text) to service_role;
grant execute on function public.family_mark_invitation_delivery_internal(uuid, boolean) to service_role;
grant execute on function public.family_get_invitation_preview_internal(text) to service_role;
grant execute on function public.family_register_accept_failure_internal(text) to service_role;
grant execute on function public.family_accept_invitation_internal(text, uuid) to service_role;

revoke all on function public.family_list_members() from public, anon;
revoke all on function public.family_list_invitations() from public, anon;
revoke all on function public.family_list_audit_log(integer, timestamptz) from public, anon;
revoke all on function public.family_revoke_invitation(uuid) from public, anon;
revoke all on function public.family_update_member_role(uuid, text) from public, anon;
revoke all on function public.family_update_member_color(uuid, text) from public, anon;
revoke all on function public.family_set_member_active(uuid, boolean) from public, anon;

grant execute on function public.family_list_members() to authenticated;
grant execute on function public.family_list_invitations() to authenticated;
grant execute on function public.family_list_audit_log(integer, timestamptz) to authenticated;
grant execute on function public.family_revoke_invitation(uuid) to authenticated;
grant execute on function public.family_update_member_role(uuid, text) to authenticated;
grant execute on function public.family_update_member_color(uuid, text) to authenticated;
grant execute on function public.family_set_member_active(uuid, boolean) to authenticated;
