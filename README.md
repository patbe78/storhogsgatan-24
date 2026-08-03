# Storhogsgatan 24

En långsiktigt hållbar React-baserad grund för familjens digitala hem. Sprint 1 innehåller en feature-first arkitektur, responsivt applikationsskal, autentiseringsinfrastruktur, dashboard-widgets, PWA och CI/CD.

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

## GitHub Pages och publicering

Pusha till `main`. GitHub Actions kör `npm ci`, lint, tester och bygge, och publicerar sedan `dist` till GitHub Pages. I repots **Settings → Pages**, välj **GitHub Actions** som källa en gång. För ny version: höj version vid behov, verifiera kommandona ovan och pusha/merga till `main`.

## Avsiktligt utanför Sprint 1

Ingen kalenderfunktion, tvättbokningslogik, inköpslistefunktion, databas eller API-logik har byggts. Dessa moduler är medvetet endast placeholders.
