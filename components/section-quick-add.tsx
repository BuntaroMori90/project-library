"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

export function SectionQuickAdd() {
  const pathname = usePathname();

  const section = pathname.startsWith("/library/books")
    ? { href: "/library/add?type=book", label: "Aggiungi libro" }
    : pathname.startsWith("/library/manga")
      ? { href: "/library/add?type=manga", label: "Aggiungi manga" }
      : pathname.startsWith("/library/anime")
        ? { href: "/library/add?type=anime", label: "Aggiungi anime" }
        : null;

  if (!section) return null;

  return (
    <Link
      href={section.href}
      className="quick-search section-quick-add"
      aria-label={section.label}
      title={section.label}
    >
      <Plus size={18} />
      <span>{section.label}</span>
    </Link>
  );
}
