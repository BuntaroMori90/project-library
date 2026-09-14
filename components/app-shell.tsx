import Link from "next/link";
import { Search } from "lucide-react";
import { BottomDock } from "@/components/bottom-dock";
import type { LibraryPreferences } from "@/lib/preferences";

function initials(name: string | null) {
  if (!name?.trim()) return "PL";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "PL"
  );
}

export function AppShell({
  children,
  preferences,
  displayName,
  avatarUrl,
}: {
  children: React.ReactNode;
  preferences: LibraryPreferences;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  return (
    <div
      className="app-shell"
      data-theme={preferences.theme}
      data-wood={preferences.woodTone}
    >
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/library" className="brand" aria-label="Home">
            <span className="brand-mark">L</span>
            <span className="brand-copy">
              <strong>Library</strong>
              <small>personale</small>
            </span>
          </Link>
          <Link
            className="quick-search"
            href="/library/add"
            aria-label="Cerca e aggiungi un'opera"
          >
            <Search size={17} />
            <span>Cerca e aggiungi un’opera</span>
          </Link>
          <Link
            href="/library/settings"
            className="profile-link"
            aria-label="Apri impostazioni profilo"
          >
            <span
              className={`profile-orb ${avatarUrl ? "has-avatar" : ""}`}
              style={
                avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined
              }
            >
              {avatarUrl ? null : initials(displayName)}
            </span>
            <span className="profile-name">{displayName ?? "Profilo"}</span>
          </Link>
        </div>
      </header>
      {children}
      <BottomDock />
    </div>
  );
}
