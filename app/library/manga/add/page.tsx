import Link from "next/link";
import { MangaAddClient } from "@/components/manga-add-client";

export default function AddMangaPage(){return <main className="page manga-add-page"><Link href="/library/manga" className="back-link">← Manga</Link><header className="page-header immersive-head compact-head"><div><p className="eyebrow">Aggiungi alla collezione</p><h1 className="title">Cerca un manga.</h1><p className="subtitle">Scegli la serie una volta sola. Volumi e metadati vengono importati dal catalogo quando disponibili.</p></div></header><MangaAddClient/></main>}
