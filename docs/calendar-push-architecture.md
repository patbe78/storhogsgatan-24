# Kalenderpush – arkitektur

Sprint 4C skickar kalenderpåminnelser från backend. Frontend använder inga timers och kan inte
välja mottagare eller initiera utskick.

## Kedja

1. `pg_cron` anropar `dispatch-calendar-reminders` varje minut genom `pg_net`.
2. Edge Function verifierar `CALENDAR_PUSH_CRON_SECRET`.
3. `calendar_claim_due_push_deliveries` låser dispatch-cursorn och skapar leveransrader.
4. Mottagare härleds från aktuella `calendar_event_participants`.
5. Profilen måste vara aktiv och ha rollen admin, adult eller member.
6. Subscriptionen måste vara aktiv och dess `auth_session_id` måste fortfarande finnas i
   `auth.sessions` för samma profil.
7. Edge Function revaliderar varje claim och skickar Web Push med VAPID.
8. Service workern visar endast payload vars `bindingId` motsvarar installationens lokala binding.
9. Notisklick öppnar eventets förekomst eller åtminstone rätt kalenderdatum.

## Datamodell

- `calendar_event_reminders`: valfritt antal unika minut-offsets per event.
- `push_subscriptions`: en rad per browserendpoint, med profil, hushåll, installation, binding och
  Auth-session. En profil kan ha flera installationer.
- `calendar_push_deliveries`: server-only journal per reminder/förekomst/profil/subscription.
- `calendar_push_dispatch_state`: singleton-cursor som gör missade cronintervall reproducerbara.

Gamla `reminder_type`/`reminder_offset_minutes` backfillas. Kolumnerna behålls enbart för
övergång/rollback; nya RPC:n använder reminder-rader som enda auktoritativa källa.

## Idempotens och catch-up

Unikheten `(reminder_id, occurrence_starts_at, profile_id, subscription_id)` gör överlappande
cron-anrop idempotenta. Claim använder radlås och `FOR UPDATE SKIP LOCKED`. Högst 200 leveranser
claimas per batch; kvarvarande pending-rader kan claimas nästa minut.

Påminnelser högst tio minuter sena kan skickas. Äldre kandidater journalförs som `expired`.
En `processing`-leverans återförs inte automatiskt efter ett oklart externt resultat: det undviker
dubbelutskick om pushleverantören tog emot meddelandet men journaluppdateringen misslyckades.

## Återkommande event och tid

Backend beräknar daily, weekly, monthly och yearly i lokal `Europe/Stockholm`-tid och konverterar
varje förekomst till `timestamptz` efter lokal datumberäkning. Monthly/yearly clampas sekventiellt
på samma sätt som frontendens date-fns-logik, exempelvis 31 januari → 28 februari → 28 mars.

Kontraktstesterna täcker intervall, slutdatum, occurrence count, månadsslut, skottår samt båda
CET/CEST-övergångarna.

## Session och delad installation

Supabase-JWT:ns `session_id` sparas server-side av `push_register_subscription`; klienten kan inte
ange värdet. Dispatch kontrollerar motsvarande `auth.sessions(id, user_id)` utan att returnera
Auth-data. Funktionerna är `SECURITY DEFINER`, har låst `search_path` och är återkallade för anon
och authenticated när de är server-only.

Utloggning rensar först lokal binding och försöker därefter unsubscribe och serverdeaktivering
oberoende. Supabase `signOut` fortsätter alltid. Om cleanup misslyckas hindrar sessionskontrollen en
utloggad session från framtida claim, och lokal bindingkontroll undertrycker redan köad/stale push.

Vid nästa login återbinds en befintlig browserendpoint atomärt till aktuell profil, Auth-session och
en ny binding. Detta begär aldrig notification permission. Om browsern saknar subscription krävs
fortfarande användarens aktiva val i Inställningar.

## Informationsminimering

Payload innehåller titel, relevant datum/tid, binding, leverans-ID och kalenderdjuplänk. Beskrivning,
anteckningar, endpoint, `p256dh`, auth-secret, service role och VAPID private key ingår aldrig.
Credentials får inte skrivas i klient-, Edge- eller databasloggar.
