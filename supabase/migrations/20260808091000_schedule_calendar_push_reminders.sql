-- Sprint 4C: schemalägg endast serveranropet. Migrationen skapar inga Vault-secrets.
-- Före produktionskörning måste project_url och calendar_push_cron_secret
-- finnas i Supabase Vault. Funktionen deployas med verify_jwt avstängt och
-- autentiserar detta anrop med sin separata cron-secret.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'calendar-push-reminders-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/dispatch-calendar-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-calendar-cron-secret',
          (select decrypted_secret from vault.decrypted_secrets where name = 'calendar_push_cron_secret')
      ),
      body := jsonb_build_object('scheduled_at', clock_timestamp())
    );
  $$
);
