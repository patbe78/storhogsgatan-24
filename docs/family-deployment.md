# Deploy och konfiguration för familjeinbjudningar

Ingen av följande åtgärder ska köras mot produktion innan separat granskning och godkännande.

## Produktionsstatus – Sprint 4B

Sprint 4B är produktionssatt, verifierad och accepterad.

- Samtliga fem Sprint 4B-migrationer är körda.
- `create-family-invitation` är deployad.
- `accept-family-invitation` är deployad med `--no-verify-jwt`.
- `RESEND_API_KEY`, `APP_BASE_URL` och `FAMILY_INVITE_FROM` är konfigurerade som Edge Function-secrets.
- Medlemslista, avaktivering, återaktivering och auditlogg är verifierade.
- Inbjudningar kan skapas och återkallas.
- Sista-admin-skydd och backendbehörigheter är verifierade.
- Patrik och Felix är fortsatt aktiva.
- En testmedlem har skapats, avaktiverats och återaktiverats.

Den kända begränsningen för extern e-postleverans beskrivs i
[`family-operations.md`](family-operations.md).

## Förutsättningar

- Supabase CLI och Docker för lokal miljö, alternativt separat testprojekt.
- Resend-konto och verifierad avsändardomän/testavsändare.
- En separat testadress som inte redan är Auth-användare.

## Secrets

Sätt endast som Supabase Edge Function-secrets:

```text
RESEND_API_KEY
FAMILY_INVITE_FROM
APP_BASE_URL
```

`APP_BASE_URL` ska vara applikationens rot med GitHub Pages-bas, exempelvis `https://example.github.io/storhogsgatan-24/`. Supabase tillhandahåller `SUPABASE_URL` och `SUPABASE_SERVICE_ROLE_KEY` i Edge-miljön. Ingen secret får läggas i `.env` för Vite, `VITE_*`, GitHub Pages eller repositoryt.

## Migrationsordning

1. `20260806090000_add_profile_active_status.sql`
2. `20260806091000_add_family_invitation_schema.sql`
3. `20260806092000_add_family_audit_log.sql`
4. `20260806093000_add_family_security.sql`
5. `20260806094000_enforce_active_calendar_access.sql`

Kör först mot lokal/separat test-Supabase och kör därefter `supabase/tests/family_rls.sql`. Tidigare migrationer får inte redigeras.

## Edge Functions

```sh
supabase functions deploy create-family-invitation
supabase functions deploy accept-family-invitation --no-verify-jwt
```

Create-funktionen verifierar JWT själv utöver gateway-skyddet. Accept-funktionen måste kunna ta emot nya användare utan JWT och verifierar därför själv eventuell bearer-token.

## Produktionsordning

1. Godkänn diff, RLS-matris och rollbackplan.
2. Ta databasbackup och notera aktuell migrationsversion.
3. Kör migrationerna i ordning.
4. Sätt/validera secrets.
5. Deploya Edge Functions.
6. Kör manuella admin/member/inactive-smoke tests.
7. Skicka en testinbjudan till separat adress.
8. Först därefter bjuds Åsa in via adminvyn.
