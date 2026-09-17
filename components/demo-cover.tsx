import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { DemoItem } from "@/lib/demo-data";

const optimizedCoverHosts = new Set([
  "covers.openlibrary.org",
  "static.tvmaze.com",
  "cdn.myanimelist.net",
  "api-cdn.myanimelist.net",
  "media.kitsu.app",
  "media.kitsu.io",
]);

export function canOptimizeCover(src: string) {
  // Le copertine personali passano da un endpoint autenticato: devono essere
  // richieste direttamente dal browser per mantenere la sessione utente.
  if (src.startsWith("/api/library/cover/")) return false;
  if (src.startsWith("/")) return true;
  try {
    return optimizedCoverHosts.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

export function DemoCover({
  item,
  href,
  badge,
  favorite = false,
  preload = false,
}: {
  item: DemoItem;
  href?: string;
  badge?: string;
  favorite?: boolean;
  preload?: boolean;
}) {
  const content = (
    <article className="cover-card">
      <div
        className={`cover-art ${item.coverClass ?? "cover-ink"} ${item.coverUrl ? "cover-has-image" : ""}`}
      >
        {item.coverUrl ? (
          canOptimizeCover(item.coverUrl) ? (
            <Image
              className="cover-image"
              src={item.coverUrl}
              alt={`Copertina di ${item.title}`}
              width={300}
              height={450}
              sizes="(max-width: 520px) 38vw, (max-width: 900px) 24vw, 180px"
              quality={72}
              loading={preload ? "eager" : "lazy"}
              preload={preload}
            />
          ) : (
            // URL personali o host esterni non configurati in Next Image.
            // Il fallback preserva sia autenticazione sia copertine manuali.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="cover-image"
              src={item.coverUrl}
              alt={`Copertina di ${item.title}`}
              loading={preload ? "eager" : "lazy"}
              fetchPriority={preload ? "high" : "auto"}
              decoding="async"
            />
          )
        ) : null}
        {!item.coverUrl ? <span className="cover-flare" aria-hidden="true" /> : null}
        {!item.coverUrl ? <span className="cover-title">{item.title}</span> : null}
        {!item.coverUrl ? <span className="cover-author">{item.creator}</span> : null}
        {badge ? <span className="cover-collection-badge">{badge}</span> : null}
      </div>
      <div className="cover-meta">
        <div className="cover-meta-title">
          <strong>{item.title}</strong>
          {favorite ? (
            <Star className="cover-favorite" size={13} fill="currentColor" aria-label="Preferito" />
          ) : null}
        </div>
        <span>{item.progress ?? item.status ?? item.creator}</span>
        {item.meta ? <span>{item.meta}</span> : null}
      </div>
    </article>
  );

  return href ? (
    <Link href={href} prefetch={false} className="cover-link">
      {content}
    </Link>
  ) : (
    content
  );
}
