# Kalenderpush – manuell testmatris

Använd ett testprojekt, en installerad iPhone-PWA, ytterligare en browser/enhet och minst två profiler.
Verifiera journalstatus efter varje servertest utan att kopiera subscription-credentials.

1. Aktivera push från Inställningar och verifiera informationssteget före systemdialogen.
2. Skapa en aktivitet med 5-minutersreminder och verifiera titel/tid.
3. Lägg 5 och 15 minuter på samma event och verifiera två separata journalrader/notiser.
4. Stäng PWA:n helt och verifiera push.
5. Lås telefonen och verifiera push.
6. Verifiera att samtliga aktuella deltagare får push.
7. Verifiera att icke-deltagare inte får push.
8. Avaktivera en profil och verifiera utebliven claim.
9. Ta bort en deltagare före nästa reminder och verifiera utebliven push.
10. Lägg till en deltagare före nästa reminder och verifiera framtida push.
11. Flytta eventets tid och verifiera att endast den nya reminder-tiden används.
12. Ta bort en reminder och verifiera att den inte claimas.
13. Radera eventet och verifiera utebliven framtida claim.
14. Starta två scheduleranrop samtidigt och verifiera en journalrad per dedupliceringsnyckel.
15. Gör en subscription trasig och verifiera att övriga enheter fortfarande får push.
16. Simulera 410 och verifiera `invalid_subscription` samt inaktiverad subscription.
17. Klicka notisen från annan månad och verifiera rätt event/datum.
18. Tvinga servercleanup att misslyckas, logga ut och verifiera både fortsatt logout och utebliven
    notis. Logga sedan in som annan användare på samma installation och verifiera atomär återbindning.
19. Testa event över sista söndagen i mars och oktober; lokal klocktid ska vara oförändrad.
20. Pausa cron 5 minuter och verifiera catch-up. Pausa mer än 10 minuter och verifiera `expired`.

Regression:

- PWA-installation och manifest fungerar.
- Offline-skalet laddas.
- UpdatePrompt är fortsatt promptstyrd och respekterar osparade formulär.
- Login visar aldrig notification permission automatiskt.
- Beskrivning och anteckningar förekommer inte i pushpayload eller systemnotis.
