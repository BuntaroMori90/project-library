import Image from "next/image";
import Link from "next/link";
import { Bookmark, Trash2 } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { listWishlistWorks } from "@/lib/repositories/library";
import { toggleWorkWishlist } from "../wishlist-actions";

const labels = { BOOK: "Libro", MANGA: "Manga", ANIME: "Anime" } as const;
const sections = { BOOK: "books", MANGA: "manga", ANIME: "anime" } as const;

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { profile } = await requireProfile();
  const { type } = await searchParams;
  const result = await listWishlistWorks(profile.id);
  const activeType =
    type === "BOOK" || type === "MANGA" || type === "ANIME" ? type : "ALL";
  const rows =
    activeType === "ALL"
      ? result.rows
      : result.rows.filter((row) => row.media_type === activeType);

  return (
    <main className="page wishlist-page">
      <header className="page-header immersive-head">
        <div>
          <p className="eyebrow">Da recuperare</p>
          <h1 className="title">Wishlist.</h1>
          <p className="subtitle">
            Opere che vuoi leggere, vedere o aggiungere alla collezione.
          </p>
        </div>
        <div className="wishlist-count">
          <strong>{result.rows.length}</strong>
          <span>desideri</span>
        </div>
      </header>
      <nav className="wishlist-filters" aria-label="Filtra wishlist">
        <Link
          className={activeType === "ALL" ? "active" : ""}
          href="/library/wishlist"
        >
          Tutti
        </Link>
        {Object.entries(labels).map(([value, label]) => (
          <Link
            key={value}
            className={activeType === value ? "active" : ""}
            href={`/library/wishlist?type=${value}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <section className="wishlist-grid">
          {rows.map((row) => (
            <article className="wishlist-card" key={row.wishlist_id}>
              <Link
                className="wishlist-cover"
                href={`/library/${sections[row.media_type]}/${row.work_id}`}
              >
                {row.cover_url ? (
                  <Image
                    src={row.cover_url}
                    alt={`Copertina di ${row.title}`}
                    width={240}
                    height={360}
                    sizes="(max-width: 640px) 32vw, 150px"
                  />
                ) : (
                  <span>{row.title.slice(0, 1)}</span>
                )}
              </Link>
              <div className="wishlist-copy">
                <span className="eyebrow">{labels[row.media_type]}</span>
                <Link
                  href={`/library/${sections[row.media_type]}/${row.work_id}`}
                >
                  <h2>{row.title}</h2>
                </Link>
                <p>{row.creators.join(" · ") || "Autore non disponibile"}</p>
              </div>
              <form action={toggleWorkWishlist}>
                <input type="hidden" name="workId" value={row.work_id} />
                <input
                  type="hidden"
                  name="returnPath"
                  value="/library/wishlist"
                />
                <button
                  className="wishlist-remove"
                  type="submit"
                  aria-label={`Rimuovi ${row.title} dalla wishlist`}
                >
                  <Trash2 size={17} />
                  <span>Rimuovi</span>
                </button>
              </form>
            </article>
          ))}
        </section>
      ) : (
        <section className="wishlist-empty">
          <Bookmark size={30} />
          <h2>
            {activeType === "ALL"
              ? "La wishlist è vuota."
              : `Nessun ${labels[activeType].toLowerCase()} nella wishlist.`}
          </h2>
          <p>Apri una scheda e usa “Aggiungi alla wishlist”.</p>
        </section>
      )}
    </main>
  );
}
