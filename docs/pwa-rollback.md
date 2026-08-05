# Rollback för Sprint 4A

Sprint 4A innehåller inga databasändringar och kan därför återställas enbart i webbklienten.

1. Revertera den merge eller release som introducerar Sprint 4A.
2. Kör lint, tester och produktionsbygge.
3. Publicera rollbacken genom ordinarie push till `main`.
4. Verifiera GitHub Pages-basen och de skyddade routarna.

En redan installerad klient kan behålla föregående service worker tills nästa navigation eller uppdateringskontroll. Rollbackbygget använder samma kontrollerade promptflöde och `cleanupOutdatedCaches`; rensa site data manuellt endast som sista felsökningsåtgärd. Ingen Supabase-data ligger i service-worker-cachen.
