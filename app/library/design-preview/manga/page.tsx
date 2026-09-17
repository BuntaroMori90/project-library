import Image from "next/image";
import Link from "next/link";
import { LibraryBig } from "lucide-react";
import { canOptimizeCover } from "@/components/demo-cover";
import { requireProfile } from "@/lib/profile";
import { getMangaDetail, listLibraryWorks } from "@/lib/repositories/library";
import { getMangaOwnedCounts } from "@/lib/repositories/manga-ownership";

export default async function MangaDesignPreviewPage() {
  const { profile } = await requireProfile();
  const result = await listLibraryWorks(profile.id, "MANGA");
  const rows = result.rows;
  const ownedCounts = await getMangaOwnedCounts(
    profile.id,
    rows.map((row) => row.id),
  );
  const sample = [...rows].sort(
    (a, b) => (ownedCounts.get(b.id) ?? 0) - (ownedCounts.get(a.id) ?? 0),
  )[0];

  if (!sample) {
    return (
      <main className="page design-manga-preview">
        <Link href="/library" className="back-link">← Home</Link>
        <div className="catalog-notice">
          <LibraryBig size={22} />
          <div>
            <strong>Nessuna serie manga disponibile per l’anteprima.</strong>
            <p>Questa schermata usa solo dati reali della tua libreria.</p>
          </div>
        </div>
      </main>
    );
  }

  const detail = await getMangaDetail(profile.id, sample.id);
  const ownedVolumes = Array.from(detail.ownedVolumeNumbers).sort((a, b) => a - b);

  return (
    <main className="page design-manga-preview">
      <div className="design-preview-banner" role="note">
        <span>Anteprima grafica · dati reali</span>
        <Link href="/library">← Torna alla home proposta</Link>
      </div>

      <header className="manga-preview-header">
        <p className="eyebrow">Proposta scheda manga</p>
        <h1>{sample.title}</h1>
        <p>
          Nella scheda della serie mostriamo solo i volumi che risultano
          effettivamente posseduti. Nessun buco, nessuna sagoma dei mancanti.
        </p>
      </header>

      <section className="manga-series-object" aria-label={`Serie ${sample.title}`}>
        <div className="manga-series-cover-wrap">
          {sample.cover_url ? (
            canOptimizeCover(sample.cover_url) ? (
              <Image
                className="manga-series-cover"
                src={sample.cover_url}
                alt={`Copertina rappresentativa di ${sample.title}`}
                width={320}
                height={480}
                sizes="130px"
                quality={72}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="manga-series-cover"
                src={sample.cover_url}
                alt={`Copertina rappresentativa di ${sample.title}`}
              />
            )
          ) : (
            <div className="manga-series-cover manga-series-cover-empty">
              {sample.title.slice(0, 1)}
            </div>
          )}
        </div>
        <div>
          <span className="eyebrow">Serie nella collezione</span>
          <h2>{sample.title}</h2>
          <strong>
            {ownedVolumes.length} {ownedVolumes.length === 1 ? "volume" : "volumi"}
          </strong>
          <p>
            La copertina qui rappresenta la serie. I singoli volumi sotto usano
            immagini reali solo quando il catalogo le possiede.
          </p>
        </div>
      </section>

      <section className="manga-owned-preview-section">
        <header className="collection-shelf-heading">
          <div>
            <p className="eyebrow">La mia collezione</p>
            <h2>Volumi posseduti</h2>
          </div>
          <span>{ownedVolumes.length} sul ripiano</span>
        </header>

        {ownedVolumes.length ? (
          <div className="manga-owned-shelf">
            <div className="manga-owned-scroll">
              <div className="manga-owned-track">
                {ownedVolumes.map((volume) => (
                  <article className="manga-owned-volume" key={volume}>
                    <div className="manga-owned-object" aria-label={`Volume ${volume}`}>
                      <small>Libronia</small>
                      <strong>{String(volume).padStart(2, "0")}</strong>
                      <span>{sample.title}</span>
                    </div>
                    <div className="manga-owned-label">Vol. {volume}</div>
                  </article>
                ))}
              </div>
            </div>
            <div className="manga-owned-lip" aria-hidden="true" />
          </div>
        ) : (
          <div className="collection-empty-shelf">
            <div className="collection-empty-back" aria-hidden="true" />
            <div>
              <strong>Nessun volume posseduto registrato.</strong>
              <p>Non mostriamo volumi mancanti per riempire artificialmente il ripiano.</p>
            </div>
          </div>
        )}

        <p className="preview-data-note">
          Le copertine neutre numerate non fingono un’edizione reale: indicano
          volumi posseduti per cui al momento non è disponibile una copertina
          specifica nel catalogo. Quando esiste un’immagine affidabile, qui verrà
          usata quella reale.
        </p>

        {ownedVolumes.length > 12 ? (
          <div className="manga-volume-compact-strip" aria-label="Elenco compatto volumi posseduti">
            <span>Vista compatta</span>
            <p>{ownedVolumes.map((volume) => `#${volume}`).join(" · ")}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
