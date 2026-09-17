import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { canOptimizeCover } from "@/components/demo-cover";

export type CollectionShelfItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  coverUrl?: string;
  kind: "book" | "manga" | "anime";
  favorite?: boolean;
};

export function CollectionShelf({
  eyebrow,
  title,
  items,
  emptyTitle,
  emptyText,
  preloadFirst = false,
}: {
  eyebrow: string;
  title: string;
  items: CollectionShelfItem[];
  emptyTitle: string;
  emptyText: string;
  preloadFirst?: boolean;
}) {
  return (
    <section className="collection-shelf-section">
      <header className="collection-shelf-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {items.length ? <span>{items.length} in vista</span> : null}
      </header>

      {items.length ? (
        <div className="collection-shelf">
          <div className="collection-shelf-scroll">
            <div className="collection-shelf-track">
              {items.map((item, index) => (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={item.href}
                  prefetch={false}
                  className={`collection-shelf-item is-${item.kind}`}
                  aria-label={`Apri ${item.title}`}
                >
                  <div className="collection-object-zone">
                    <div className="collection-cover-shell">
                      {item.coverUrl ? (
                        canOptimizeCover(item.coverUrl) ? (
                          <Image
                            className="collection-cover-image"
                            src={item.coverUrl}
                            alt={`Copertina di ${item.title}`}
                            width={320}
                            height={480}
                            sizes="(max-width: 520px) 34vw, 150px"
                            quality={72}
                            preload={preloadFirst && index === 0}
                          />
                        ) : (
                          // Le copertine private devono essere richieste dal browser
                          // per mantenere la sessione autenticata.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="collection-cover-image"
                            src={item.coverUrl}
                            alt={`Copertina di ${item.title}`}
                            loading={preloadFirst && index === 0 ? "eager" : "lazy"}
                            decoding="async"
                          />
                        )
                      ) : (
                        <div className="collection-cover-placeholder" aria-hidden="true">
                          <span>{item.title.slice(0, 1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="collection-label">
                    <div className="collection-label-title">
                      <strong>{item.title}</strong>
                      {item.favorite ? (
                        <Heart size={11} fill="currentColor" aria-label="Preferito" />
                      ) : null}
                    </div>
                    <span>{item.subtitle}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="collection-shelf-lip" aria-hidden="true" />
        </div>
      ) : (
        <div className="collection-empty-shelf">
          <div className="collection-empty-back" aria-hidden="true" />
          <div>
            <strong>{emptyTitle}</strong>
            <p>{emptyText}</p>
          </div>
        </div>
      )}
    </section>
  );
}
