# Inventario: integrazione conservativa con redesign

Origine funzionale: `codex/inventory-workflows` (PR #6).
Ramo di integrazione per revisione: `integration/inventory-redesign`.

Nessun merge della PR #6, nessuna migrazione database e nessun test browser di scrittura sulla preview.

## Implementato dal ramo funzionale
- Inserimenti consecutivi opzionali, con collegamento alla scheda/edizione salvata.
- Blocco degli invii contemporanei e delle modifiche di contesto durante il salvataggio.
- Annullamento delle ricerche obsolete cambiando tipo/modalità; conservazione dei dati su errore.
- Conferma prima di perdere una bozza manuale cambiando tipo.
- Rimozione con conseguenze esplicite, stato occupato e messaggio locale se non confermata. Non è ancora un cestino: non promette annullamento.
- Aggiornamenti stato/capitolo manga senza richiesta automatica a Kitsu o riscrittura dei metadati condivisi.
- Aggiunta multipla cartacea di volumi esistenti in un’edizione, intervalli, deduplicazione, transazione e verifica della raccolta dell’utente.

## Integrazione con il redesign
`AddWorkFlow` mantiene il layout grafico del `main` e integra la logica della PR #6:
- `AbortController` persistente e protezione dalle risposte obsolete;
- lock anti-doppio invio;
- controlli disabilitati durante il salvataggio;
- protezione della bozza manuale, inclusa la copertina;
- opzione “Dopo il salvataggio, aggiungi un’altra opera”;
- reset della copertina manuale dopo un salvataggio consecutivo;
- messaggio di successo con link alla scheda appena salvata.

Restano preservati dal redesign:
- `ManualWorkCover` e `manualCoverUrl`;
- titolo come unico campo obbligatorio;
- autore facoltativo per libri e manga;
- volumi totali facoltativi per manga;
- `coverUrl` nell’inserimento manuale;
- copertine reali del catalogo tramite `result.coverUrl`.

`ManualWorkCover` accetta ora uno stato `disabled` per rispettare il lock di salvataggio senza cambiare il comportamento di elaborazione della copertina.

## Inserimento multiplo manga
`BulkOwnedVolumes` resta nella sezione `#volumi` di `app/library/manga/[id]/page.tsx`, solo quando `libraryEntry` esiste e immediatamente prima di `VolumeLegend`.

La logica funzionale è quella della PR #6. Il solo adattamento grafico consiste in classi dedicate (`bulk-owned-volumes` e relative classi figlie) invece di riutilizzare `manual-work-entry`.

Lo stile di coordinamento è isolato in `app/styles/part21.css` e non sostituisce `part20.css`.

## Moduli funzionali preservati
- `components/add-work-flow.tsx`
- `components/confirm-remove-form.tsx`
- `components/library-remove-form.tsx`
- `components/book-delete-form.tsx`
- `components/bulk-owned-volumes.tsx`
- `app/api/manga/owned-volumes/route.ts`
- `app/library/manga/[id]/actions.ts`
- `app/library/remove-actions.ts`
- `lib/inventory/volume-selection.ts`
- `lib/repositories/bulk-owned-volumes.ts`
- `tests/inventory-workflows.cjs`

## Limiti intenzionali
- Il batch non crea unità mancanti dal catalogo e non converte edizioni digitali.
- La rimozione esistente rimane definitiva: cestino e backup non sono implementati in questa tranche.
- Lettura online/piattaforma, doppio formato, barcode, ricerca estesa e passaggio wishlist con conferma edizione richiedono i prossimi interventi.
- Le modifiche del catalogo personale/shared vanno esaminate prima di cambiare schema.

## Verifiche
- `tests/inventory-workflows.cjs`: parser, sovrapposizioni, limiti, accesso, formato digitale, errore senza insert e ripetizione.
- Il test inventory è stato rieseguito in ambiente locale isolato senza database e passa.
- Il commit di integrazione riceve build/TypeScript `success` dalla Git integration; nessun test browser di scrittura è stato eseguito.
- La revisione ESLint completa deve essere eseguita dalla CI prima del merge; in questa integrazione sono state controllate manualmente le regole applicabili ai file modificati.

## Preview
La preview non costituisce un ambiente dati isolato: prima di provare salvataggi via browser, collegare esplicitamente `DATABASE_URL` e autenticazione di test.

Non fare merge, migrazioni o test di scrittura in produzione senza revisione congiunta.
