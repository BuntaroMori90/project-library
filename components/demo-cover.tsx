import Image from "next/image";
import Link from "next/link";
import type { DemoItem } from "@/lib/demo-data";

const optimizedCoverHosts = new Set([
  "covers.openlibrary.org",
  "static.tvmaze.com",
  "cdn.myanimelist.net",
  "api-cdn.myanimelist.net",
  "media.kitsu.app",
  "media.kitsu.io",
]);

function canOptimizeCover(src: string) {
  if (src.startsWith("/")) return true;
  try {
    return optimizedCoverHosts.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

export function DemoCover({ item, href }: { item: DemoItem; href?: string }) {
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
              loading="lazy"
            />
          ) : (
            // URL personali possono provenire da host non configurati in Next Image.
            // Manteniamo il fallback per non rompere copertine inserite manualmente.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="cover-image"
              src={item.coverUrl}
              alt={`Copertina di ${item.title}`}
              loading="lazy"
              decoding="async"
            />
          )
        ) : null}
        {!item.coverUrl ? (
          <span className="cover-flare" aria-hidden="true" />
        ) : null}
        {!item.coverUrl ? (
          <span className="cover-title">{item.title}</span>
        ) : null}
        {!item.coverUrl ? (
          <span className="cover-author">{item.creator}</span>
        ) : null}
      </div>
      <div className="cover-meta">
        <strong>{item.title}</strong>
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
