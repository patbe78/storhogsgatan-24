# Manuell testplan för PWA

## Första intryck och installation

- Verifiera loginvyn på desktop, Android och iPhone.
- Installera via webbläsarprompt i kompatibel Android-webbläsare.
- Öppna iOS-guiden och kontrollera Safari-stegen.
- Starta den installerade appen och verifiera standalone-läge och safe areas.
- Kontrollera vanlig ikon, maskable-ikon och Apple Touch Icon på en riktig enhet.

## Routing på GitHub Pages

- Öppna `/storhogsgatan-24/kalender?view=month#dag` direkt.
- Öppna `/storhogsgatan-24/installningar?panel=app` direkt.
- Verifiera att avsedd route och query/hash återställs utan en andra reload.
- Verifiera att en saknad asset med filändelse stannar på 404 och inte skickas till SPA:n.
- Verifiera att protected routes leder till login när session saknas.

## Offline och uppdatering

- Gå offline och kontrollera bannern; gå online och kontrollera att den försvinner.
- Publicera en ny testversion och kontrollera att uppdateringsprompten visas.
- Klicka snabbt två gånger och verifiera att bara ett uppdateringsanrop görs.
- Gör ett formulär smutsigt och verifiera att uppdateringsknappen är blockerad.
- Spara, återställ eller stäng formuläret och verifiera att `beforeunload` tas bort.
- Simulera uppdateringsfel och verifiera feltext utan automatisk reload-loop.
- Efter lyckad uppdatering: verifiera att prompten inte visas igen direkt.
