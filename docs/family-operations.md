# Drift av familjeadministration

## Känd begränsning för e-postleverans

Resend kan för närvarande inte leverera familjeinbjudningar till externa
mottagare eftersom en egen avsändardomän inte är verifierad.

Tills vidare skapas familjemedlemmar manuellt i Supabase. Det befintliga
inbjudningsflödet kan fortfarande användas för att skapa, granska och återkalla
inbjudningar, men extern leverans ska inte betraktas som tillgänglig.

Engångstokens får inte hämtas från loggar, databasen eller Edge Function-anrop.
Databasen lagrar endast tokenens SHA-256-hash och tokenklartext kan inte
återskapas.

En eventuell Sprint 4B.1 kan införa ett säkert manuellt leveransläge med en
kopierbar engångslänk. Sprint 4B.1 är uppskjuten och får inte implementeras utan
uttryckligt godkännande.

## E-postinbjudan efter verifierad domän

När en egen avsändardomän har verifierats:

1. Logga in som aktiv admin.
2. Öppna **Inställningar → Familjemedlemmar**.
3. Ange familjemedlemmens namn, e-post, rollen `member` eller `adult` och profilfärg.
4. Skicka inbjudan och kontrollera statusen.
5. Mottagaren öppnar mejllänken inom sju dagar och skapar konto eller loggar in med befintligt konto.
6. Household, roll och färg sätts automatiskt. Ingen SQL behövs.

Ett befintligt konto måste ha samma e-post och sakna household. Konto i annat household nekas.

## Leveransfel

Kontrollera i ordning:

1. Att `RESEND_API_KEY`, `FAMILY_INVITE_FROM` och `APP_BASE_URL` finns som Edge secrets.
2. Att avsändaren är verifierad i Resend.
3. Att mottagaren tillåts av Resends testläge.
4. Att invitationens status är **Leverans misslyckades** och att auditposten skapades.
5. Återkalla den misslyckade inbjudan innan en ny skapas.

Visa aldrig Resends råa svar och kopiera aldrig request bodies till loggar eftersom de innehåller länktoken under sändningen.

## Avaktivering och återaktivering

Avaktivering bevarar profil, kalenderaktiviteter och deltagarrelationer. Personen försvinner från nya deltagarval och kan inte mutera kalender/familjedata. Efter login visas avaktiveringsmeddelandet.

Återaktivering görs från listan **Avaktiverade medlemmar**. Rollen och färgen behålls. En sista aktiv admin kan inte avaktiveras eller nedgraderas.

## Incident vid läckt länk

Återkalla invitationen omedelbart och skapa en ny. Tokenklartext kan inte återskapas från databasens SHA-256-hash. Kontrollera auditloggen och relevanta Edge-loggar, men logga inte den läckta token igen.
