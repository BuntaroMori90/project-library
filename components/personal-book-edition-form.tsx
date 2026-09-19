"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ManualWorkCover } from "@/components/manual-work-cover";
import type { IsbnEdition } from "@/lib/catalog/isbn-edition";
export function PersonalBookEditionForm({ workId, title, author, canEditAuthor }: { workId: string; title: string; author: string; canEditAuthor: boolean }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const locked = useRef(false);
  const [cover, setCover] = useState("");
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [match, setMatch] = useState<IsbnEdition | null>(null);
  const [message, setMessage] = useState("");
  async function search() {
    if (locked.current) return;
    locked.current = true; setSearching(true); setMatch(null); setMessage("");
    try {
      const isbn = String(new FormData(form.current!).get("customIsbn") ?? "");
      const response = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(isbn)}`, { signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMatch(data.edition);
      if (!data.edition) setMessage("Edizione non trovata nei cataloghi. Puoi compilare i campi qui sotto: nessun dato inserito è stato cancellato.");
    } catch (error) { setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "La ricerca sta impiegando troppo tempo. Riprova o inserisci i dati a mano."); }
    finally { locked.current = false; setSearching(false); }
  }
  function apply() {
    if (!match || !form.current) return;
    const values = { customName: match.title, customPublisher: match.publisher, customPublicationYear: match.year, customPageCount: match.pages, customLanguage: match.language, customIsbn: match.isbn };
    for (const [name, value] of Object.entries(values)) {
      const input = form.current.elements.namedItem(name) as HTMLInputElement | null;
      if (input && value) input.value = value;
    }
    if (match.cover && !cover) setCover(match.cover);
    setMatch(null); setMessage("Dati riportati nel modulo. Puoi correggerli prima di salvare.");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || processing) return;
    locked.current = true; setSaving(true); setMessage("");
    const body = new FormData(event.currentTarget); body.set("customCoverUrl", cover);
    try {
      const response = await fetch("/api/books/personal-edition", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      form.current?.reset(); setCover(""); setMatch(null); setMessage("La tua copia è stata salvata.");
      router.replace(data.redirect, { scroll: false }); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Salvataggio non riuscito. I dati sono ancora nel modulo."); }
    finally { locked.current = false; setSaving(false); }
  }
  return <form ref={form} onSubmit={save} className="edition-personal-form manual-edition-form">
    <input type="hidden" name="workId" value={workId} />
    <div className="manual-edition-intro"><strong>La tua copia di {title}</strong><p>Cerca con l’ISBN oppure inserisci direttamente i dati. Puoi partire anche dalla sola copertina e completare il resto in seguito.</p></div>
    <fieldset disabled={saving || searching} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <label>ISBN<input name="customIsbn" placeholder="10 o 13 caratteri, se disponibili" /></label>
      <button type="button" className="soft-action" onClick={search} disabled={processing}>{searching ? "Ricerca in corso…" : "Cerca dati dall’ISBN"}</button>
      {match ? <div className="catalog-notice"><div><strong>{match.title}</strong><p>{[match.publisher, match.year, match.isbn].filter(Boolean).join(" · ")}</p><p>Verifica che sia l’edizione di questo libro prima di usare i dati.</p><button type="button" className="soft-action" onClick={apply}>Usa questi dati</button></div></div> : null}
      <ManualWorkCover value={cover} title={title} onChange={setCover} onBusyChange={setProcessing} disabled={saving || searching} />
      <div className="edition-personal-grid">
        <label>Nome / tipo edizione<input name="customName" placeholder="Es. illustrata, tascabile…" /></label>
        {canEditAuthor ? <label>Autore<input name="customAuthor" defaultValue={author} /></label> : null}
        <label>Editore<input name="customPublisher" /></label>
        <label>Lingua<input name="customLanguage" placeholder="Es. Italiano" /></label>
        <label>Formato<input name="customFormat" placeholder="Brossura, rilegato, eBook…" /></label>
        <label>Pagine<input name="customPageCount" type="number" min="1" /></label>
        <label>Anno<input name="customPublicationYear" type="number" min="1000" max="9999" /></label>
      </div>
    </fieldset>
    {message ? <p role="status" aria-live="polite">{message}</p> : null}
    <button type="submit" className="primary-btn edition-save-button" disabled={saving || searching || processing}>{saving ? "Salvataggio…" : processing ? "Elaborazione copertina…" : "Salva la mia copia"}</button>
  </form>;
}
