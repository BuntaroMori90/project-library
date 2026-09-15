/* eslint-disable @next/next/no-img-element */
import { BadgePlus, Gem, Sparkles } from "lucide-react";
import { BookCoverField } from "@/components/book-cover-field";
import { query } from "@/lib/db";
import { requireProfile } from "@/lib/profile";
import { addPersonalMangaEdition } from "./actions";

type PersonalMangaEditionRow = {
  id: string;
  name: string;
  custom_name: string | null;
  custom_publisher: string | null;
  custom_language: string | null;
  custom_format: string | null;
  custom_cover_url: string | null;
  custom_isbn: string | null;
  custom_publication_year: number | null;
  volume_number: string | number | null;
};

export async function MangaCollectorPanel({ workId }: { workId: string }) {
  const { profile } = await requireProfile();
  const result = await query<PersonalMangaEditionRow>(
    `select e.id,e.name,
            o.custom_name,o.custom_publisher,o.custom_language,o.custom_format,
            o.custom_cover_url,o.custom_isbn,o.custom_publication_year,
            min(cu.unit_number) as volume_number
       from editions e
       join ownership o on o.edition_id=e.id and o.profile_id=$1
       left join content_units cu
         on cu.edition_id=e.id and cu.unit_type='VOLUME'
      where e.work_id=$2 and e.source_provider='MANUAL'
      group by e.id,e.name,o.custom_name,o.custom_publisher,o.custom_language,
               o.custom_format,o.custom_cover_url,o.custom_isbn,
               o.custom_publication_year
      order by o.custom_publication_year desc nulls last,e.created_at desc`,
    [profile.id, workId],
  );

  return (
    <section className="page manga-collector-page">
      <section id="collezione-speciale" className="detail-section manga-collector-stage">
        <div className="section-heading detail-heading">
          <div>
            <span className="eyebrow">Collezionismo</span>
            <h2>Variant, limited e speciali</h2>
          </div>
          <span>{result.rows.length ? `${result.rows.length} registrate` : "La tua raccolta"}</span>
        </div>
        <p className="subtitle detail-explainer">
          Il catalogo online descrive soprattutto l&apos;opera. Qui puoi registrare
          le copie particolari che possiedi anche quando non esistono nel provider.
        </p>

        <details className="manga-special-add">
          <summary>
            <BadgePlus size={18} /> Aggiungi variant o edizione speciale
          </summary>
          <form action={addPersonalMangaEdition} className="manga-special-form">
            <input type="hidden" name="workId" value={workId} />
            <BookCoverField uploadEndpoint="/api/manga/personal-edition" />

            <div className="manga-special-primary-fields">
              <label>
                Tipo
                <select name="editionType" defaultValue="Variant">
                  <option>Standard</option>
                  <option>Variant</option>
                  <option>Limited</option>
                  <option>Deluxe</option>
                  <option>Speciale</option>
                  <option>Box / Cofanetto</option>
                  <option>Altro</option>
                </select>
              </label>
              <label>
                Volume
                <input name="volumeNumber" type="number" min="1" step="1" placeholder="Es. 1" />
              </label>
            </div>

            <details className="manga-special-optional">
              <summary>Altri dettagli · facoltativi</summary>
              <div className="edition-personal-grid">
                <label>Nome / etichetta<input name="customName" placeholder="Es. Variant Lucca Comics" /></label>
                <label>Editore<input name="customPublisher" placeholder="J-Pop, Panini, Star Comics…" /></label>
                <label>Lingua<input name="customLanguage" defaultValue="Italiano" /></label>
                <label>ISBN / EAN<input name="customIsbn" /></label>
                <label>Anno<input name="customPublicationYear" type="number" min="1000" max="9999" /></label>
              </div>
            </details>

            <button type="submit" className="primary-btn manga-special-save">
              <Sparkles size={17} /> Salva nella collezione
            </button>
          </form>
        </details>

        {result.rows.length ? (
          <div className="manga-special-grid">
            {result.rows.map((edition) => {
              const name = edition.custom_name || edition.name;
              return (
                <article key={edition.id} className="manga-special-card">
                  <div className="manga-special-cover">
                    {edition.custom_cover_url ? (
                      <img src={edition.custom_cover_url} alt={`Copertina ${name}`} />
                    ) : (
                      <Gem size={28} />
                    )}
                  </div>
                  <div className="manga-special-copy">
                    <div className="edition-badge-row">
                      <span className="edition-badge">{edition.custom_format || "Speciale"}</span>
                      {edition.volume_number ? <span className="edition-badge subtle">Vol. {Number(edition.volume_number)}</span> : null}
                    </div>
                    <h3>{name}</h3>
                    <p>{[edition.custom_publisher, edition.custom_language].filter(Boolean).join(" · ") || "Dati da completare"}</p>
                    <small>
                      {[edition.custom_isbn, edition.custom_publication_year].filter(Boolean).join(" · ") || "Puoi completare i dati in seguito"}
                    </small>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="manga-special-empty">
            <Gem size={22} />
            <p>Nessuna variant o edizione speciale registrata.</p>
          </div>
        )}
      </section>
    </section>
  );
}
