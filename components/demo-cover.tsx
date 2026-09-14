/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { DemoItem } from "@/lib/demo-data";

export function DemoCover({ item, href }: { item: DemoItem; href?: string }) {
  const content = (
    <article className="cover-card">
      <div
        className={`cover-art ${item.coverClass ?? "cover-ink"} ${item.coverUrl ? "cover-has-image" : ""}`}
      >
        {item.coverUrl ? (
          <img
            className="cover-image"
            src={item.coverUrl}
            alt={`Copertina di ${item.title}`}
            loading="lazy"
          />
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
    <Link href={href} className="cover-link">
      {content}
    </Link>
  ) : (
    content
  );
}
