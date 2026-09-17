# Inventario: primo intervento conservativo

Branch: codex/inventory-workflows. Nessuna modifica CSS, migrazione o deploy produzione.

## Implementato
- Inserimenti consecutivi opzionali, con collegamento alla scheda/edizione salvata.
- Blocco degli invii contemporanei e delle modifiche di contesto durante il salvataggio.
- Annullamento delle ricerche obsolete cambiando tipo/modalità; conservazione dei dati su errore.
- Conferma prima di perdere una bozza manuale cambiando tipo.
- Rimozione con conseguenze esplicite, stato occupato e messaggio locale se non confermata. Non è ancora un cestino: non promette annullamento.
- Aggiornamenti stato/capitolo manga senza richiesta automatica a Kitsu o riscrittura dei metadati condivisi.
- Aggiunta multipla cartacea di volumi esistenti in un’edizione, intervalli, deduplicazione, transazione e verifica della raccolta dell’utente.

## Limiti intenzionali
- Il batch non crea unità mancanti dal catalogo e non converte edizioni digitali.
- La rimozione esistente rimane definitiva: cestino e backup non sono implementati in questa tranche.
- Lettura online/piattaforma, doppio formato, barcode, ricerca estesa e passaggio wishlist con conferma edizione richiedono i prossimi interventi.
- Le modifiche del catalogo personale/shared vanno esaminate prima di cambiare schema.

## Coordinamento grafico
Nessun file in app/styles e nessuna home/nav modificata.
Unica integrazione in app/library/manga/[id]/page.tsx: import e inserimento di BulkOwnedVolumes sopra VolumeLegend, solo quando libraryEntry esiste. Preservare questa integrazione nel redesign.
Componenti funzionali di competenza di questo ramo: AddWorkFlow, ConfirmRemoveForm, LibraryRemoveForm, BookDeleteForm, BulkOwnedVolumes.

## Verifiche
- node tests/inventory-workflows.cjs: parser, sovrapposizioni, limiti, accesso, formato digitale, errore senza insert e ripetizione.
- TypeScript e lint mirato.
- SQL su Neon isolato br-sweet-cloud-aw8gutrb: selezione 1–12,15,18 inserisce 14 volumi; ripetizione inserisce 0. Nessuna scrittura in produzione.
- La navigazione autenticata completa e l’uso dei moduli sul telefono non sono ancora verificati.

## Preview
La build Vercel da PR non costituisce un ambiente dati isolato: prima di provare salvataggi via browser, collegare esplicitamente DATABASE_URL e autenticazione di test. Non fare merge o migrazioni in produzione senza revisione e coordinamento con il ramo grafico.
