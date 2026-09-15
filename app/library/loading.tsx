export default function LibraryLoading() {
  return (
    <main className="page page-library" aria-busy="true" aria-live="polite">
      <div className="catalog-notice">
        <div>
          <strong>Caricamento libreria…</strong>
          <p>Sto preparando la tua collezione.</p>
        </div>
      </div>
    </main>
  );
}
