# Kalenderpush – rollback

## Stoppa utskick först

1. Avaktivera cronjobbet utan att radera journalen:

   ```sql
   select cron.unschedule('calendar-push-reminders-every-minute');
   ```

2. Verifiera att inga nya `processing`-rader skapas.
3. Deploya inte om eller rotera nycklar förrän incidentens omfattning är dokumenterad.

## Backend

1. Deploya föregående Edge Function-version eller ta bort routen efter att cron stoppats.
2. Rotera `CALENDAR_PUSH_CRON_SECRET` och VAPID private key endast vid misstänkt läcka.
3. Behåll `calendar_push_deliveries` för revision/felsökning.

## Frontend/PWA

1. Återställ frontendversionen genom normal granskad release.
2. Behåll Workbox versions-/updatePrompt-flöde; tvinga inte okontrollerad service-worker-aktivering.
3. En gammal `push-sw.js` får ligga kvar tills samtliga klienter har uppdaterats, men cron ska vara
   stoppad så att inga nya payloads skickas.

## Databas

Tabellerna är additiva och bör normalt lämnas kvar vid applikationsrollback. Att radera dem skulle
förstöra leveransjournal och befintliga subscriptioner. Om full schemarollback senare godkänns:

1. Exportera leveransjournalen.
2. Backfilla högst en vald reminder till legacykolumnerna om äldre frontend ska användas.
3. Återkalla RPC-grants.
4. Radera funktioner före tabeller i beroendeordning.
5. Radera aldrig tabeller som en akut incidentåtgärd utan separat backup och godkännande.
