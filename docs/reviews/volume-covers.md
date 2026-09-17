# Copertine personali dei volumi e scaffale variant

## Comportamento
- La scheda manga mostra i volumi posseduti, incluse le edizioni personali. Ogni copia ha una copertina privata modificabile tramite file JPG/PNG/WebP o URL HTTPS.
- Il caricamento usa il ridimensionamento esistente (420 x 630 massimo, 220000 caratteri codificati). Il salvataggio attende la fine dell'elaborazione. File originali limitati a 10 MB.
- Il ripristino rimuove solo la copertina personale; torna l'eventuale immagine del volume nel catalogo. Nessuna copertina della serie viene spacciata per copertina di ogni volume.
- Le edizioni speciali possedute appaiono anche sullo scaffale manga, con etichetta e numero, senza moltiplicare tutte le copertine standard.
- La galleria mostra inizialmente 24 copie e carica le immagini quando servono. Il catalogo completo rimane apribile per gestire aggiunte/rimozioni.
- Libri ha un pulsante Aggiungi sempre disponibile. L'overflow della demo scaffale mobile e' corretto: pagina 390px, scorrimento interno al ripiano.
- Nessuna modifica al layout Anime o introduzione della fotocamera.

## Prestazioni
Le unita' di una nuova edizione vengono inserite con generate_series in una query invece di una query per volume. Le letture indipendenti partono in parallelo. Il raggruppamento degli scaffali non ricopia continuamente gli array. Non e' stato misurato un miglioramento percentuale del tempo di avvio su telefono reale.

## Verifiche
- Build Next completata con configurazione auth fittizia solo nel processo locale; nessuna credenziale o connessione live. TypeScript passa. ESLint senza errori, due avvisi preesistenti in alphabet-rail.tsx.
- tests/inventory-workflows.cjs: regressioni di inserimento intervalli, duplicati e permessi.
- tests/volume-covers.cjs: validazione, accesso, errori, ripristino, cache privata e controllo autorizzazione prima di 304, inserimento di 500 volumi in una query e totali invalidi.
- Browser mobile 390 x 844 e desktop 1440 x 1000: demo scaffali. Galleria reale montata temporaneamente con 26 copie fittizie: editor, upload, ridimensionamento, 24->26 elementi, nessun overflow o errore browser. La route temporanea e' stata rimossa.
- Le tre query SELECT nuove/aggiornate sono state eseguite sul branch Neon isolato con dati fittizi: 14 volumi letti correttamente.
- Dopo conferma esplicita dell'utente, test SQL reale completato sul branch isolato: salvataggio e rilettura riusciti, aggiornamento da altro profilo con zero righe modificate, ripristino esatto della copertina precedente e catalogo invariato. Tutto eseguito in una transazione con controlli automatici. Le prove HTTP delle API usano dipendenze simulate; non equivalgono a un salvataggio autenticato end-to-end dal browser.
- I controlli GitHub quality-and-build e il deployment Vercel di anteprima sono passati.

## Rilascio
Applicare migrations/20260917_owned_volume_covers.sql prima di abilitare i salvataggi. Migrazione additiva, gia' applicata solo al branch di test. Produzione non modificata. Le letture restano compatibili con lo schema precedente, le scritture senza colonna restituiscono un messaggio 503 comprensibile. Completare la revisione e la verifica autenticata dal browser prima del merge/deploy di produzione.
