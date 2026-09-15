"use client";

import Link from "next/link";

export default function BookDetailError({ reset }: { reset: () => void }) {
  return (
    <main className="page book-detail-page">
      <section className="catalog-notice" style={{ marginTop: 24 }}>
        <div>
          <strong>Non siamo riusciti a salvare la modifica.</strong>
          <p>La tua libreria non è stata cancellata. Ricarica la scheda e riprova; se stavi caricando una copertina, scegli di nuovo l'immagine.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" className="primary-btn" onClick={() => reset()}>Riprova</button>
            <Link href="/library/books" className="soft-action">Torna ai libri</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
