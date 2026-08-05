# Familjekalender – teknisk modell

Kalendermodulen är uppdelad i databas-RPC:er, services, domänutilities, hooks, en presentationsadapter och utbytbara React-vyer. Month-, Week-, Day- och Agenda-komponenterna känner inte till Supabase, RLS eller återkomstregler. `calendar-view.adapter.ts` är den enda översättningen från domänens förekomster till vyernas modeller.

## Tid och heldag

Tidsatta värden lagras som `timestamptz` och tolkas i `Europe/Stockholm`. Heldag lagras som startdatum och inkluderande slutdatum. Utility-lagret konverterar slutdatumet till exklusiv midnatt dagen efter vid överlappning och rendering.

## Återkommande serier

En eventrad är seriens mall. Regeln lagras i `calendar_recurrence_series`; förekomster materialiseras inte i databasen utan genereras begränsat för efterfrågat intervall. Modellen stöder dag, vecka, månad och år med positivt intervall samt inget slut, slutdatum eller antal.

`Denna och framtida` avslutar originalserien dagen före vald förekomst. Vid redigering skapas en ny serie med `parent_series_id` och `split_from_date`. Vid radering skapas ingen ny serie. Tidigare förekomster bevaras. En intern databasfunktion verifierar att split-/raderingsdatumet är en faktisk förekomst enligt frekvens och intervall, ligger inom datum-/antalsgränserna och beräknar det auktoritativa antalet tidigare förekomster.

## Säkerhet

Alla kalenderrader avgränsas med `household_id`. Direkta mutationer är återkallade för `authenticated`; atomära `SECURITY DEFINER`-RPC:er validerar hushåll, roll, ägare och deltagare. Funktionerna har explicit `search_path`, och åtkomst beviljas funktionsvis. Member måste själv vara deltagare och kan aldrig välja familjeaktivitet. Guest saknar kalenderåtkomst.

`profiles.role` och `profiles.household_id` skyddas både med kolumnprivilegier och trigger. En separat admin-RPC kan endast hantera roll för profiler som redan tillhör administratörens hushåll. Anslutning till hushållet sker enbart genom det separat granskade backfill-skriptet; admin-RPC:n kan varken ansluta en okopplad profil eller flytta en profil mellan hushåll.

## Mobil svepning

Pointer Events används med `touch-action: pan-y`. Ett periodbyte kräver minst 48 pixlars horisontell rörelse och horisontell dominans på 1,25. Interaktiva element och dialoger undantas. Knapparna Föregående/Nästa finns alltid som tangentbords- och skärmläsarvänligt alternativ.

## Migrationer

1. `20260805090000_add_household_scope.sql`
2. Granska `calendar_household_preflight.sql`.
3. Fyll och separat godkänn `assign_storhogsgatan24_household.review.sql`; den ligger inte i migrationsmappen.
4. Fyll och separat godkänn `assign_calendar_profile_colors.review.sql` efter genomförd household-backfill; skriptet ligger inte i migrationsmappen och använder `ROLLBACK` som standard.
5. `20260805091000_create_calendar_schema.sql`
6. `20260805092000_create_calendar_security.sql`
7. `20260805093000_seed_calendar_defaults.sql` skapar endast systemkategorier.
8. Kör `supabase/tests/calendar_rls.sql` endast mot testdatabas.

Ingen SQL i Sprint 3 körs automatiskt mot produktion.

## Radslut

Sprint 3 använder tillfälligt Prettiers `endOfLine: auto` för att undvika en bred normaliseringsdiff i befintliga filer. En separat underhållsändring bör införa `endOfLine: lf` tillsammans med en granskad `.gitattributes` och en kontrollerad engångsnormalisering. Ingen renormalisering ingår i Sprint 3.
