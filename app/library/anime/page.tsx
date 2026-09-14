import Link from "next/link";
import { Plus } from "lucide-react";
import { AnimeBrowser } from "@/components/anime-browser";
import { demoAnime, type DemoItem } from "@/lib/demo-data";
import { normalizePreferences } from "@/lib/preferences";
import { requireProfile } from "@/lib/profile";
import { listLibraryWorks } from "@/lib/repositories/library";

const statusLabels:Record<string,string>={PLANNED:"Da vedere",IN_PROGRESS:"In visione",COMPLETED:"Completato",PAUSED:"In pausa",DROPPED:"Abbandonato"};
export default async function AnimePage(){const{profile}=await requireProfile();const preferences=normalizePreferences(profile.preferences);const rows=(await listLibraryWorks(profile.id,"ANIME")).rows;const realItems:DemoItem[]=rows.map((row)=>{const season=row.current_season!=null?Number(row.current_season):null;const episode=row.current_episode!=null?Number(row.current_episode):null;return{id:row.id,title:row.title,creator:row.creators?.join(" · ")||"Studio non disponibile",status:statusLabels[row.status]??"Da vedere",progress:season?`S${season}${episode?` · Ep. ${episode}`:""}`:undefined,meta:row.total_episodes?`${row.total_episodes} episodi`:undefined,coverUrl:row.cover_url??undefined,coverClass:"poster-blue"}});const items=realItems.length?realItems:demoAnime;return <main className="page page-anime"><header className="page-header immersive-head page-header-actions"><div><p className="eyebrow">La tua stanza · Anime</p><h1 className="title">Videoteca.</h1><p className="subtitle">Qui il legno lascia spazio a una stanza media: una TV come elemento scenografico e un catalogo digitale per organizzare ciò che hai visto o vuoi vedere.</p></div><Link className="primary-btn add-library-button" href="/library/add?type=anime"><Plus size={17}/> Aggiungi anime</Link></header><AnimeBrowser items={items} defaultGroupBy={preferences.anime.groupBy} density={preferences.anime.density}/></main>}
