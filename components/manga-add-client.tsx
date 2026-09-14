"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, LoaderCircle } from "lucide-react";
import type { MangaCatalogResult } from "@/lib/catalog/types";

export function MangaAddClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaCatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function search(event: React.FormEvent) {
    event.preventDefault(); if (query.trim().length < 2) return; setLoading(true); setError(null);
    try { const response=await fetch(`/api/catalog/manga/search?q=${encodeURIComponent(query.trim())}`); const payload=await response.json(); if(!response.ok) throw new Error(payload.error ?? "Ricerca non disponibile."); setResults(payload.results ?? []); } catch(err){ setError(err instanceof Error ? err.message : "Ricerca non disponibile."); } finally { setLoading(false); }
  }
  async function importManga(result: MangaCatalogResult) {
    setImporting(result.providerId); setError(null);
    try { const response=await fetch("/api/catalog/manga/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({providerId:result.providerId})}); const payload=await response.json(); if(!response.ok) throw new Error(payload.error ?? "Import non riuscito."); router.push(`/library/manga/${payload.workId}`); router.refresh(); } catch(err){ setError(err instanceof Error ? err.message : "Import non riuscito."); } finally { setImporting(null); }
  }
  return <div className="catalog-add"><form className="catalog-search" onSubmit={search}><Search size={18}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Cerca Berserk, Monster, Vagabond…" autoFocus/><button className="primary-btn" type="submit" disabled={loading}>{loading?"Cerco…":"Cerca"}</button></form>{error?<p className="catalog-error">{error}</p>:null}{!loading&&query&&results.length===0&&!error?<p className="catalog-empty">Nessun risultato. Prova con titolo originale o autore.</p>:null}<div className="catalog-results">{results.map((result)=><article className="catalog-result" key={`${result.provider}-${result.providerId}`}><div className="catalog-cover">{result.coverUrl?<img src={result.coverUrl} alt=""/>:<span>{result.title.slice(0,1)}</span>}</div><div className="catalog-result-copy"><span className="eyebrow">{result.publicationStatus === "ONGOING" ? "In pubblicazione" : result.publicationStatus === "COMPLETED" ? "Completo" : "Catalogo"}</span><h2>{result.title}</h2><p>{result.creators.map((creator)=>creator.name).join(" · ") || "Autore non disponibile"}</p><div className="catalog-facts">{result.volumeCount?<span>{result.volumeCount} volumi</span>:<span>Volumi da verificare</span>}{result.chapterCount?<span>{result.chapterCount} capitoli</span>:null}{result.releaseYear?<span>{result.releaseYear}</span>:null}</div></div><button className="add-result" type="button" onClick={()=>importManga(result)} disabled={Boolean(importing)}>{importing===result.providerId?<LoaderCircle className="spin" size={18}/>:<Plus size={18}/>}<span>{importing===result.providerId?"Importo":"Aggiungi"}</span></button></article>)}</div></div>;
}
