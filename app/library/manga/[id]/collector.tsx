/* eslint-disable @next/next/no-img-element */
import { BadgePlus, Gem, LibraryBig, Sparkles } from "lucide-react";
import { BookCoverField } from "@/components/book-cover-field";
import { query } from "@/lib/db";
import { requireProfile } from "@/lib/profile";
import { addPersonalMangaEdition } from "./actions";

type PersonalMangaEditionRow = {
  id: string;
  name: string;
  total_units: number | null;
  custom_name: string | null;
  custom_publisher: string | null;
  custom_language: string | null;
  custom_format: string | null;
  custom_cover_url: string | null;
  custom_isbn: string | null;
  custom_publication_year: number | null;
  volume_number: string | number | null;
  owned_count: string | number;
};

function hasUsefulEditionData(edition: PersonalMangaEditionRow | null) {
  if (!edition) return false;
  return (
    Number(edition.owned_count) > 0 ||
    Boolean(
      edition.custom_cover_url ||
        edition.custom_publisher ||
        edition.custom_isbn ||
        edition.custom_publication_year ||
        (edition.custom_name && edition.custom_name !== "Edizione personale"),
    )
  );
}

export async function MangaCollectorPanel({ workId }: { workId: string }) {
  const { profile } = await requireProfile();
  const result = await query<PersonalMangaEditionRow>(
    `select e.id,e.name,e.total_units,
            o.custom_name,o.custom_publisher,o.custom_language,o.custom_format,
            o.custom_cover_url,o.custom_isbn,o.custom_publication_year,
            min(cu.unit_number) as volume_number,
            count(distinct ou.id) as owned_count
       from editions e
       join ownership o on o.edition_id=e.id and o.profile_id=$1
       left join content_units cu
         on cu.edition_id=e.id and cu.unit_type='VOLUME'
       left join owned_units ou
         on ou.edition_id=e.id and ou.profile_id=$1
      where e.work_id=$2 and e.source_provider='MANUAL'
      group by e.id,e.name,e.total_units,o.custom_name,o.custom_publisher,o.custom_language,
               o.custom_format,o.custom_cover_url,o.custom_isbn,
               o.custom_publication_year
      order by o.custom_publication_year desc nulls last,e.created_at desc`,
    [profile.id, workId],
  );

  const standardEditions = result.rows.filter(
    (edition) => edition.custom_format?.toLowerCase() === "standard",
  );
  const specialEditions = result.rows.filter(
    (edition) => edition.custom_format?.toLowerCase() !== "standard",
  );
  const standardEdition = standardEditions[0] ?? null;
  const showStandardCard = hasUsefulEditionData(standardEdition);
  const needsVolumes = Boolean(standardEdition && !standardEdition.total_units);

  return (
    <section className="page manga-collector-page manga-collector-compact">
      <section id="edizione-personale" className="detail-section manga-collector-stage">
        <div className="section-heading detail-heading">
          <div>
            <span className="eyebrow">Collezione fisica</span>
            <h2>Edizione personale</h2>
          </div>
          {standardEdition && Number(standardEdition.owned_count) > 0 ? (
            <span>{Number(standardEdition.owned_count)} posseduti</span>
          ) : null}
        </div>

        {showStandardCard && standardEdition ? (
          <div className="manga-special-grid manga-standard-summary">
            <article className="manga-special-card">
              <div className="manga-special-cover">
                {standardEdition.custom_cover_url ? (
                  <img
                    src={standardEdition.custom_cover_url}
                    alt={`Copertina ${standardEdition.custom_name || standardEdition.name}`}
                  />
                ) : (
                  <LibraryBig size={28} />
                )}
              </div>
              <div className="manga-special-copy">
                <div className="edition-badge-row">
                  <span className="edition-badge">Edizione personale</span>
                  {standardEdition.total_units ? (
                    <span className="edition-badge subtle">{standardEdition.total_units} volumi</span>
                  ) : null}
                </div>
                <h3>{standardEdition.custom_name || standardEdition.name}</h3>
                <p>
                  {[standardEdition.custom_publisher, standardEdition.custom_language]
                    .filter(Boolean)
                    .join(" · ") || "Edizione fisica personale"}
                </p>
              </div>
            </article>
          </div>
        ) : null}

        <details className="manga-special-add manga-physical-add" open={needsVolumes}>
          <summary>
            <BadgePlus size={18} />
            {standardEdition ? "Modifica edizione fisica" : "Aggiungi un'edizione fisica"}
          </summary>
          <form action={addPersonalMangaEdition} className="manga-special-form">
            <input type="hidden" name="workId" value={workId} />
            <input type="hidden" name="editionType" value="Standard" />
            <BookCoverField
              uploadEndpoint="/api/manga/personal-edition"
              defaultValue={standardEdition?.custom_cover_url ?? ""}
            />
            <div className="manga-special-primary-fields">
              <label>
                Nome edizione
                <input
                  name="customName"
                  defaultValue={standardEdition?.custom_name ?? ""}
                  placeholder="Es. Edizione italiana"
                />
              </label>
              <label>
                Volumi totali
                <input
                  name="totalVolumes"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={standardEdition?.total_units ?? ""}
                  placeholder="Es. 10"
                />
              </label>
            </div>
            <details className="manga-special-optional">
              <summary>Altri dettagli · facoltativi</summary>
              <div className="edition-personal-grid">
                <label>Editore<input name="customPublisher" defaultValue={standardEdition?.custom_publisher ?? ""} placeholder="J-Pop, Panini, Star Comics…" /></label>
                <label>Lingua<input name="customLanguage" defaultValue={standardEdition?.custom_language ?? "Italiano"} /></label>
                <label>ISBN / EAN<input name="customIsbn" defaultValue={standardEdition?.custom_isbn ?? ""} /></label>
                <label>Anno<input name="customPublicationYear" type="number" min="1000" max="9999" defaultValue={standardEdition?.custom_publication_year ?? ""} /></label>
              </div>
            </details>
            <button type="submit" className="primary-btn manga-special-save">
              <LibraryBig size={17} /> Salva edizione fisica
            </button>
          </form>
        </details>
      </section>

      <section id="collezione-speciale" className="detail-section manga-collector-stage">
        <div className="section-heading detail-heading">
          <div>
            <span className="eyebrow">Collezionismo</span>
            <h2>Variant, limited e speciali</h2>
          </div>
          {specialEditions.length ? <span>{specialEditions.length} registrate</span> : null}
        </div>

        {specialEditions.length ? (
          <div className="manga-special-grid">
            {specialEditions.map((edition) => {
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
                    <p>
                      {[edition.custom_publisher, edition.custom_language]
                        .filter(Boolean)
                        .join(" · ") || "Edizione speciale"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        <details className="manga-special-add manga-special-add-compact">
          <summary><BadgePlus size={18} /> Aggiungi variant o edizione speciale</summary>
          <form action={addPersonalMangaEdition} className="manga-special-form">
            <input type="hidden" name="workId" value={workId} />
            <BookCoverField uploadEndpoint="/api/manga/personal-edition" />
            <div className="manga-special-primary-fields">
              <label>
                Tipo
                <select name="editionType" defaultValue="Variant">
                  <option>Variant</option><option>Limited</option><option>Deluxe</option>
                  <option>Speciale</option><option>Box / Cofanetto</option><option>Altro</option>
                </select>
              </label>
              <label>Volume<input name="volumeNumber" type="number" min="1" step="1" placeholder="Es. 1" /></label>
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
      </section>
    </section>
  );
}
