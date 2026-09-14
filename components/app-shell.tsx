import Link from "next/link";
import { Search } from "lucide-react";
import { BottomDock } from "@/components/bottom-dock";
import type { LibraryPreferences } from "@/lib/preferences";

export function AppShell({ children, preferences }: { children: React.ReactNode; preferences: LibraryPreferences }) {
  return (
    <div className="app-shell" data-theme={preferences.theme} data-wood={preferences.woodTone}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/library" className="brand" aria-label="Home">
            <span className="brand-mark">L</span>
            <span className="brand-copy"><strong>Library</strong><small>codename</small></span>
          </Link>
          <button className="quick-search" type="button" aria-label="Cerca nella libreria">
            <Search size={17} />
            <span>Cerca nella tua collezione</span>
            <kbd>⌘ K</kbd>
          </button>
          <Link href="/library/settings" className="profile-orb" aria-label="Apri impostazioni">FC</Link>
        </div>
      </header>
      {children}
      <BottomDock />
    </div>
  );
}
