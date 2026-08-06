-- Sprint 4B: immutable household administration audit trail.
create table public.family_audit_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  actor_profile_id uuid null references public.profiles (id) on delete set null,
  target_profile_id uuid null references public.profiles (id) on delete set null,
  invitation_id uuid null references public.family_invitations (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint family_audit_action_valid check (action in (
    'invitation_created',
    'invitation_delivery_failed',
    'invitation_revoked',
    'invitation_accepted',
    'role_changed',
    'color_changed',
    'member_deactivated',
    'member_reactivated'
  )),
  constraint family_audit_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index family_audit_household_created_idx
  on public.family_audit_log (household_id, created_at desc);

alter table public.family_audit_log enable row level security;

comment on table public.family_audit_log is
  'Append-only administration history. Frontend roles have no insert, update or delete grants.';
