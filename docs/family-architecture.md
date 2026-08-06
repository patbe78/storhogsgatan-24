# Sprint 4B – familjearkitektur

## Ansvarsgränser

React använder services och hooks. Presentativa komponenter anropar aldrig Supabase direkt. Klientanropbara `family_*`-RPC:er verifierar `auth.uid()`, aktiv profil, adminroll och household. Interna RPC:er är återkallade från `anon` och `authenticated` och kan bara anropas med Edge Functions service-role.

Edge Functions äger tokenklartext, Auth Admin och Resend. Databasen äger household-koppling, roll, färg, avaktivering, sista-admin-lås och audit.

## Datamodell

`profiles.is_active` behåller profilen och alla historiska främmande nycklar. En check constraint håller `deactivated_at` och `deactivated_by` konsekventa.

`family_invitations` lagrar normaliserad e-post, avsedd profil, leveransdata och endast SHA-256-hash av token. Status härleds från accept/revoke/expiry/lock/delivery. Ett GiST-exclusion constraint förhindrar överlappande öppna inbjudningar per household/e-post.

`family_audit_log` är append-only för frontend. Profilreferenser använder `ON DELETE SET NULL` så att historiken överlever senare borttagning av Auth-konto.

## RLS och RPC

| Data               | Admin                             | Adult/member               | Guest/inaktiv      | Mutation                  |
| ------------------ | --------------------------------- | -------------------------- | ------------------ | ------------------------- |
| Egen profil        | Läs                               | Läs                        | Läs egen           | Endast ofarliga självfält |
| Household-profiler | Läs                               | Kalender-RPC: id/namn/färg | Nekad              | Admin-RPC                 |
| Invitations        | Läs eget household utan tokenhash | Nekad                      | Nekad              | Säker RPC/Edge            |
| Audit              | Läs eget household                | Nekad                      | Nekad              | Intern RPC                |
| Kalender           | Befintlig läsmodell               | Befintlig läsmodell        | UI spärrar inaktiv | Aktiv profil krävs        |

Klient-RPC: `family_list_members`, `family_list_invitations`, `family_list_audit_log`, `family_revoke_invitation`, `family_update_member_role`, `family_update_member_color`, `family_set_member_active` och `calendar_list_active_profiles`.

Interna RPC: `family_create_invitation_internal`, `family_mark_invitation_delivery_internal`, `family_get_invitation_preview_internal`, `family_register_accept_failure_internal`, `family_accept_invitation_internal` och `family_write_audit_internal`.

Alla SECURITY DEFINER-funktioner har explicit `search_path`, kvalificerade tabellnamn och minsta möjliga EXECUTE-grants.

## Sista admin

Rollbyte och avaktivering tar `FOR UPDATE`-lås på household-raden innan målprofilen kontrolleras. Alla samtidiga adminmutationer i ett household serialiseras därför. Mutationen avvisas med `FAMILY_LAST_ADMIN` om antalet övriga aktiva administratörer är noll.

## Token och rate limit

Edge Function skapar 32 kryptografiskt slumpmässiga byte och URL-säker token. Databasen får bara lowercase SHA-256 hex. Klartexten hålls i funktionsminnet tills Resend-anropet är byggt och returneras/loggas aldrig.

Giltigheten är exakt sju dagar. Token låses med `FOR UPDATE` vid accept och blir oanvändbar efter accept/revoke/expiry. Fem misslyckade, identifierbara acceptförsök låser inbjudan i 15 minuter. Skapande begränsas till tio per admin/household/timme och tre per mottagare/household/dygn.

## Accept och återhämtning

Accept-sidan läser query/hash och tar omedelbart bort token från adressfältet. Token hålls endast i sidans minne. Befintlig användare autentiseras med Supabase Auth; e-post måste matcha och profilen måste sakna household. Ny användare skapas med Auth Admin och `email_confirm: true`, eftersom mejllänken bevisar åtkomst till adressen.

Auth-konto och PostgreSQL kan inte dela transaktion. Kontot skapas först. Profilkoppling, roll, färg, accept och audit är en atomär databastransaktion. Om den misslyckas lämnas kontot utan household och användaren kan logga in och försöka igen; kontot raderas inte automatiskt.

## Audit

Tillåtna actions är `invitation_created`, `invitation_delivery_failed`, `invitation_revoked`, `invitation_accepted`, `role_changed`, `color_changed`, `member_deactivated` och `member_reactivated`. Metadata innehåller bara relevanta gamla/nya värden – aldrig token, e-postlösenord eller secrets.
