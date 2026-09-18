"use client";

import Link from "next/link";
import { BookOpen, Film, Home, LibraryBig } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  ["/library", "Home", Home],
  ["/library/books", "Libri", BookOpen],
  ["/library/manga", "Manga", LibraryBig],
  ["/library/anime", "Anime", Film],
] as const;

export function BottomDock() {
  const pathname = usePathname();

  return (
    <nav className="bottom-dock bottom-dock-four" aria-label="Navigazione principale">
      {links.map(([href, label, Icon]) => {
        const active =
          href === "/library" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
