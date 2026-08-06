# Storhogsgatan 24

Dokumentation för familjeadministration och inbjudningar:

- [Arkitektur och säkerhet](docs/family-architecture.md)
- [Deploy och secrets](docs/family-deployment.md)
- [Drift och aktuell leveransbegränsning](docs/family-operations.md)
- [Manuell testplan](docs/family-manual-test.md)
- [Rollback](docs/family-rollback.md)

En React-baserad webbapp för familjens gemensamma vardag, med autentisering, dashboard, kalender och ett responsivt applikationsskal.

## Installation

Kräver Node.js 22 eller senare.

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
```

Kopiera `.env.example` till `.env` och ange `VITE_SUPABASE_URL` samt `VITE_SUPABASE_ANON_KEY`. Autentisering använder Supabase Auth med sessionspersistens. Utan variabler visas inloggningssidan men inga anrop görs.

## PWA

Appen kan installeras på kompatibla Android-webbläsare via webbläsarens installationsprompt och på iPhone/iPad via Safaris Lägg till på hemskärmen. Installation, offline-status, version och manuell uppdateringskontroll finns under Inställningar → App.

- [Installationsguide](docs/pwa-installation.md)
- [Manuell testplan](docs/pwa-manual-test.md)
- [Rollback](docs/pwa-rollback.md)

Service workern precachar endast statiska byggfiler. Supabase-data runtime-cachas inte. Nya versioner aktiveras genom ett kontrollerat promptflöde och aldrig medan ett registrerat formulär har osparade ändringar.

## GitHub Pages och CI/CD

Pull Requests kör installation, lint, tester och produktionsbygge utan Pages-rättigheter och utan uppladdning av Pages-artifact. Uppladdning och deploy sker endast vid push till `main`. Appens produktionsbas är `/storhogsgatan-24/`; en base-aware 404-fallback återställer direkta klientrutter utan reload-loop.

## Avgränsning för Sprint 4A

Sprinten innehåller inga SQL-migrationer, familjeinbjudningar, Edge Functions, Auth Admin API-anrop, medlemsadministration, profilavaktivering eller auditlogg.
