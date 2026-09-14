import Link from "next/link";
import { Search } from "lucide-react";
import { BottomDock } from "@/components/bottom-dock";
import type { LibraryPreferences } from "@/lib/preferences";

function initials(name: string | null) {
  if (!name?.trim()) return "PL";
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PL";
}

export function AppShell({ children, preferences, displayName }: { children: React.ReactNode; preferences: LibraryPreferences; displayName: string | null }) {
  return (
    <div className="app-shell" data-theme={preferences.theme} data-wood={preferences.woodTone}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/library" className="brand" aria-label="Home">
            <span className="brand-mark">L</span>
            <span className="brand-copy"><strong>Library</strong><small>personale</small></span>
          </Link>
          <Link className="quick-search" href="/library/add" aria-label="Cerca e aggiungi un'opera">
            <Search size={17} />
            <span>Cerca e aggiungi un’opera</span>
          </Link>
          <Link href="/library/settings" className="profile-orb" aria-label="Apri impostazioni">{initials(displayName)}</Link>
        </div>
      </header>
      {children}
      <BottomDock />
    </div>
  );
}
