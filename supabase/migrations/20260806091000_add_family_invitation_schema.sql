-- Sprint 4B: invitation records contain hashes only, never plaintext tokens.
create extension if not exists btree_gist with schema extensions;

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  invited_name text not null,
  role text not null,
  profile_color text not null,
  invited_by uuid not null references public.profiles (id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  accepted_by uuid null references public.profiles (id) on delete set null,
  revoked_at timestamptz null,
  revoked_by uuid null references public.profiles (id) on delete set null,
  delivery_status text not null default 'pending',
  last_sent_at timestamptz null,
  send_count integer not null default 0,
  failed_attempt_count integer not null default 0,
  locked_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_invitations_email_normalized
    check (email = lower(btrim(email)) and char_length(email) between 3 and 320),
  constraint family_invitations_name_present
    check (char_length(btrim(invited_name)) between 1 and 100),
  constraint family_invitations_role_valid check (role in ('adult', 'member')),
  constraint family_invitations_color_valid check (profile_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint family_invitations_token_hash_valid check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint family_invitations_delivery_valid check (delivery_status in ('pending', 'sent', 'failed')),
  constraint family_invitations_counts_valid check (send_count >= 0 and failed_attempt_count >= 0),
  constraint family_invitations_expiry_valid check (expires_at > created_at),
  constraint family_invitations_accept_pair
    check (accepted_by is null or accepted_at is not null),
  constraint family_invitations_revoke_pair
    check (revoked_by is null or revoked_at is not null),
  constraint family_invitations_not_accepted_and_revoked
    check (not (accepted_at is not null and revoked_at is not null)),
  constraint family_invitations_no_overlapping_open_invites
    exclude using gist (
      household_id with =,
      email with =,
      tstzrange(created_at, expires_at, '[)') with &&
    ) where (accepted_at is null and revoked_at is null)
);

create index family_invitations_household_created_idx
  on public.family_invitations (household_id, created_at desc);
create index family_invitations_inviter_rate_idx
  on public.family_invitations (invited_by, household_id, created_at desc);
create index family_invitations_recipient_rate_idx
  on public.family_invitations (household_id, email, created_at desc);

create or replace function public.set_family_invitation_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_family_invitation_updated_at
before update on public.family_invitations
for each row execute function public.set_family_invitation_updated_at();

alter table public.family_invitations enable row level security;

comment on column public.family_invitations.token_hash is
  'Lowercase SHA-256 hex digest. Plaintext invitation tokens must never be persisted.';
