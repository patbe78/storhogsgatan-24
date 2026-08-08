-- Sprint 4C security fix: Supabase default table grants can otherwise override
-- column-level SELECT restrictions. Reset all client grants before granting the
-- minimum metadata required by the frontend.

revoke all privileges on table public.calendar_event_reminders
  from public, anon, authenticated;
revoke all privileges on table public.push_subscriptions
  from public, anon, authenticated;
revoke all privileges on table public.calendar_push_deliveries
  from public, anon, authenticated;
revoke all privileges on table public.calendar_push_dispatch_state
  from public, anon, authenticated;

-- Household RLS continues to restrict reminder rows.
grant select on table public.calendar_event_reminders to authenticated;

-- The settings UI filters by installation and compares binding/status only.
-- RLS continues to restrict rows to profile_id = auth.uid().
grant select (installation_id, binding_id, status)
  on table public.push_subscriptions to authenticated;

-- Preserve unrestricted server access for Edge/RPC execution. No client role
-- receives access to the delivery journal or dispatch cursor.
grant all privileges on table public.calendar_event_reminders to service_role;
grant all privileges on table public.push_subscriptions to service_role;
grant all privileges on table public.calendar_push_deliveries to service_role;
grant all privileges on table public.calendar_push_dispatch_state to service_role;
