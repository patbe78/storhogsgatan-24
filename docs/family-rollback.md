# Rollback – Sprint 4B

Rollback ska föregås av backup och separat godkännande. Eftersom migrationerna innehåller audit- och invitationshistorik är destruktiv automatisk down-migration inte inkluderad.

## Säkert funktionsstopp

1. Dölj familjeadministrationen genom att återdeploya föregående frontendversion.
2. Ta bort eller inaktivera Edge Function-routes.
3. Återkalla/rotera `RESEND_API_KEY` vid misstänkt incident.
4. Behåll tabeller och auditdata medan orsaken utreds.

## Databasåterställning

- Återställ tidigare definitioner av `current_calendar_role`, `calendar_save_event` och `calendar_delete_event` från den senast godkända migrationen om aktiv-spärren orsakar regression.
- Ta bort nya policies/RPC:er endast efter att frontend och Edge Functions har rullats tillbaka.
- Exportera `family_audit_log` och `family_invitations` innan tabeller eventuellt tas bort.
- Ta inte bort `profiles.is_active` eller avaktiveringsfält medan någon profil är avaktiverad.

En full återställning från backup är säkrare än handskrivna destruktiva `DROP`-kommandon i produktion.
