# Manuell testplan – Sprint 4B

Kör mot lokal eller separat test-Supabase, aldrig direkt mot produktion.

## Admin

- Familjemedlemmar visas under Inställningar endast för admin.
- Giltigt formulär skickar exakt ett anrop och visar väntande/sänd status.
- Ogiltig e-post/färg och tomt namn stoppas.
- Aktiv medlem och aktiv dubblett ger rätt svenskt fel.
- Invitation kan återkallas; accepterad/utgången kan inte återkallas.
- Roll och färg kan ändras.
- Medlem kan avaktiveras/återaktiveras och audit uppdateras.
- Sista aktiva admin kan varken nedgraderas eller avaktiveras.

## Övriga roller

- Adult, member och guest saknar adminsektionen.
- Direkta REST/RPC-försök i `family_rls.sql` nekas.
- Avaktiverad användare ser rätt meddelande och kan inte mutera kalendern.

## Accept

- URL-token tas bort direkt från adressfältet.
- Ny användare skapar konto och får rätt household/roll/färg.
- Befintlig användare utan household kan logga in och acceptera.
- Fel e-post och konto i annat household ger neutralt fel.
- Utgången, återkallad, accepterad, okänd och låst token ger samma neutrala svar.
- Fem felaktiga identifierbara försök låser i 15 minuter.
- Omladdning efter URL-rensning kräver att mejllänken öppnas igen.

## Regression

- Patrik och Felix kan logga in och rätt namn visas.
- Dashboard, kalenderfärger, återkommande aktiviteter och logout fungerar.
- PWA-installation, standalone, offline-banner och uppdateringsprompt fungerar.
- GitHub Pages-direktnavigation och 404-fallback fungerar med `/storhogsgatan-24/`.
