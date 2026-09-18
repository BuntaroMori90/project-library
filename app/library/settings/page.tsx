import Link from "next/link";
import { Bookmark } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { saveLibraryPreferences } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const { profile } = await requireProfile();
  const preferences = normalizePreferences(profile.preferences);
  return (
    <main className="page settings-page">
      <header className="page-header immersive-head">
        <div>
          <p className="eyebrow">Personalizza</p>
          <h1 className="title">Impostazioni.</h1>
          <p className="subtitle">
            Non solo colore: qui decidi come deve comportarsi la tua libreria
            ogni volta che la apri.
          </p>
        </div>
      </header>
      {params.saved === "1" ? (
        <div className="saved-banner">Preferenze salvate.</div>
      ) : null}
      <form action={saveLibraryPreferences} className="settings-grid">
        <section className="settings-card wide">
          <div className="settings-title">
            <span>Aspetto</span>
            <h2>La stanza deve sembrare tua.</h2>
          </div>
          <div className="settings-fields three">
            <label>
              Tema
              <select name="theme" defaultValue={preferences.theme}>
                <option value="dark">Scuro</option>
                <option value="light">Chiaro</option>
                <option value="auto">Automatico</option>
              </select>
            </label>
            <label>
              Legno
              <select name="woodTone" defaultValue={preferences.woodTone}>
                <option value="walnut">Noce</option>
                <option value="oak">Rovere</option>
                <option value="ebony">Ebano</option>
              </select>
            </label>
            <div className="wood-swatches" aria-hidden="true">
              <span className="walnut" />
              <span className="oak" />
              <span className="ebony" />
            </div>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-title">
            <span>Libri</span>
            <h2>Biblioteca</h2>
          </div>
          <div className="settings-fields">
            <label>
              Archivia per
              <select
                name="booksGroupBy"
                defaultValue={preferences.books.groupBy}
              >
                <option value="title">Titolo</option>
                <option value="creator">Autore</option>
              </select>
            </label>
            <label>
              Vista
              <select
                name="booksCoverView"
                defaultValue={preferences.books.coverView}
              >
                <option value="front">Copertine frontali</option>
                <option value="spine">Coste</option>
              </select>
            </label>
            <label>
              Densità
              <select
                name="booksDensity"
                defaultValue={preferences.books.density}
              >
                <option value="comfortable">Ariosa</option>
                <option value="compact">Compatta</option>
              </select>
            </label>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-title">
            <span>Manga</span>
            <h2>Collezione</h2>
          </div>
          <div className="settings-fields">
            <label>
              Archivia per
              <select
                name="mangaGroupBy"
                defaultValue={preferences.manga.groupBy}
              >
                <option value="title">Titolo / serie</option>
                <option value="creator">Autore</option>
              </select>
            </label>
            <label>
              Vista
              <select
                name="mangaCoverView"
                defaultValue={preferences.manga.coverView}
              >
                <option value="front">Copertine frontali</option>
                <option value="spine">Coste</option>
              </select>
            </label>
            <label>
              Densità
              <select
                name="mangaDensity"
                defaultValue={preferences.manga.density}
              >
                <option value="compact">Scaffali stretti</option>
                <option value="comfortable">Più ariosa</option>
              </select>
            </label>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-title">
            <span>Anime</span>
            <h2>Videoteca</h2>
          </div>
          <div className="settings-fields">
            <label>
              Archivia per
              <select
                name="animeGroupBy"
                defaultValue={preferences.anime.groupBy}
              >
                <option value="title">Titolo</option>
                <option value="creator">Studio</option>
              </select>
            </label>
            <label>
              Densità poster
              <select
                name="animeDensity"
                defaultValue={preferences.anime.density}
              >
                <option value="comfortable">Grandi</option>
                <option value="compact">Compatti</option>
              </select>
            </label>
          </div>
        </section>
        <section className="settings-card settings-shortcut-card">
          <div className="settings-title">
            <span>Liste</span>
            <h2>Wishlist</h2>
            <p>Le opere che vuoi aggiungere in futuro, fuori dalla navigazione principale.</p>
          </div>
          <Link className="secondary-btn settings-shortcut-link" href="/library/wishlist">
            <Bookmark size={17} /> Apri Wishlist
          </Link>
        </section>
        <section className="settings-card account-card">
          <div className="settings-title">
            <span>Account</span>
            <h2>{profile?.display_name ?? "Il tuo profilo"}</h2>
            <p>
              {profile?.username ? `@${profile.username}` : "Profilo personale"}
            </p>
          </div>
          <div className="profile-settings-fields">
            <label>
              Nome visualizzato
              <input
                name="displayName"
                defaultValue={profile.display_name ?? ""}
                maxLength={80}
              />
            </label>
            <label>
              Nome utente
              <input
                name="username"
                defaultValue={profile.username ?? ""}
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9._-]+"
              />
            </label>
            <label className="avatar-url-field">
              URL immagine profilo
              <input
                name="avatarUrl"
                type="url"
                defaultValue={profile.avatar_url ?? ""}
                placeholder="https://…"
              />
            </label>
          </div>
          <SignOutButton />
        </section>
        <div className="settings-save">
          <button className="primary-btn" type="submit">
            Salva impostazioni
          </button>
        </div>
      </form>
    </main>
  );
}
