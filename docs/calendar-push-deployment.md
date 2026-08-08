# Kalenderpush – produktionsdriftsättning

Detta dokument beskriver senare manuella steg. Sprintimplementationen kör eller ändrar inget i
production.

## Värden som måste skapas

Frontendens GitHub Pages-build:

- `VITE_VAPID_PUBLIC_KEY`: publik URL-safe Base64 VAPID-nyckel. Den är inte hemlig men matas in via
  repositoryts befintliga secrets/variables-flöde.

Supabase Edge Function-secrets:

- `VAPID_PUBLIC_KEY`: samma publika nyckel.
- `VAPID_PRIVATE_KEY`: privat VAPID-nyckel; får aldrig finnas i Vite, GitHub Pages eller repositoryt.
- `VAPID_SUBJECT`: kontakt-URI, rekommenderat appens HTTPS-URL. Den används inte för e-postutskick.
- `CALENDAR_PUSH_CRON_SECRET`: minst 32 slumpmässiga byte, separat från Supabase/API/VAPID.

Supabase tillhandahåller `SUPABASE_URL` och `SUPABASE_SERVICE_ROLE_KEY` för Edge-miljön. De får inte
kopieras till frontend.

Supabase Vault:

- `project_url`: projektets `https://<project-ref>.supabase.co`.
- `calendar_push_cron_secret`: exakt samma värde som Edge-secret
  `CALENDAR_PUSH_CRON_SECRET`.

Cron-anropet skickar varken `apikey` eller `Authorization`. Funktionen deployas med
`verify_jwt = false`, så gatewayn kräver inget Supabase-token. Handlern autentiserar i stället
anropet genom konstanttidsjämförelse av `x-calendar-cron-secret`. Lägg aldrig service-role key i
Vault för cron-anropet.

Varken Resend-nyckel eller e-postdomän används.

## Produktionsordning

1. Granska diff, databasbackup, RLS-matris och rollbackplan.
2. Kör endast `20260808090000_add_calendar_push_reminders.sql`.
3. Kör `calendar_push_rls.sql` och `calendar_push_scheduler.sql` mot separat testprojekt.
4. Skapa VAPID-paret utanför repositoryt och konfigurera Edge-secrets.
5. Skapa/validera de två Vault-värdena ovan.
6. Deploya funktionen utan gateway-JWT, eftersom den använder egen konstanttidsjämförd cron-secret:

   ```sh
   supabase functions deploy dispatch-calendar-reminders --no-verify-jwt
   ```

7. Anropa funktionen manuellt med cron-secret och verifiera tom/säker claim.
8. Kör `20260808091000_schedule_calendar_push_reminders.sql`; först nu börjar minutjobbet.
9. Kontrollera `cron.job`, `cron.job_run_details`, `net._http_response` och Functions-loggar utan att
   skriva credentials.
10. Konfigurera `VITE_VAPID_PUBLIC_KEY` för GitHub Pages-builden och deploya granskad frontend.
11. Genomför hela den manuella enhetsmatrisen innan funktionen betraktas som produktionsklar.

Migrationerna ska inte köras tillsammans med ett automatiskt `db push` om det gör att cronjobbet
startar före Edge Function och Vault. Tillämpa dem i den uttryckliga ordningen ovan.
