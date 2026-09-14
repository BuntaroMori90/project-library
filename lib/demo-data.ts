export type DemoItem = {
  id: string;
  title: string;
  creator: string;
  subtitle?: string;
  status?: string;
  progress?: string;
  meta?: string;
  coverClass?: string;
  coverUrl?: string;
};

export const demoBooks: DemoItem[] = [
  { id: "american-gods", title: "American Gods", creator: "Neil Gaiman", status: "Letto", coverClass: "cover-night" },
  { id: "animal-farm", title: "Animal Farm", creator: "George Orwell", status: "Letto", coverClass: "cover-red" },
  { id: "annihilation", title: "Annientamento", creator: "Jeff VanderMeer", status: "Da leggere", coverClass: "cover-forest" },
  { id: "atlas", title: "Atlante delle isole remote", creator: "Judith Schalansky", status: "Da leggere", coverClass: "cover-ocean" },
  { id: "aleph", title: "L'Aleph", creator: "Jorge Luis Borges", status: "Letto", coverClass: "cover-gold" },
  { id: "androids", title: "Ma gli androidi sognano pecore elettriche?", creator: "Philip K. Dick", status: "Da leggere", coverClass: "cover-electric" },
  { id: "archipelago", title: "Arcipelago Gulag", creator: "Aleksandr Solženicyn", status: "Da leggere", coverClass: "cover-stone" },
  { id: "alchemist", title: "L'alchimista", creator: "Paulo Coelho", status: "Letto", coverClass: "cover-sand" },
  { id: "dune", title: "Dune", creator: "Frank Herbert", progress: "284 / 688 pagine", coverClass: "cover-sand" },
  { id: "norwegian-wood", title: "Norwegian Wood", creator: "Haruki Murakami", status: "Da leggere", coverClass: "cover-forest" },
  { id: "1984", title: "1984", creator: "George Orwell", status: "Letto", coverClass: "cover-red" },
  { id: "stoner", title: "Stoner", creator: "John Williams", status: "Letto", coverClass: "cover-ink" },
  { id: "road", title: "La strada", creator: "Cormac McCarthy", status: "Da leggere", coverClass: "cover-stone" },
  { id: "name-rose", title: "Il nome della rosa", creator: "Umberto Eco", status: "Letto", coverClass: "cover-gold" },
  { id: "solaris", title: "Solaris", creator: "Stanisław Lem", status: "Da leggere", coverClass: "cover-ocean" },
  { id: "shining", title: "Shining", creator: "Stephen King", status: "Letto", coverClass: "cover-night" },
  { id: "foundation", title: "Fondazione", creator: "Isaac Asimov", status: "Da leggere", coverClass: "cover-electric" },
];

export const demoManga: DemoItem[] = [
  { id: "berserk", title: "Berserk", creator: "Kentaro Miura", progress: "Vol. 25 · Cap. 201", meta: "18 / 42 posseduti", coverClass: "cover-berserk" },
  { id: "billy-bat", title: "Billy Bat", creator: "Naoki Urasawa", status: "Completato", coverClass: "cover-billy" },
  { id: "blue-giant", title: "Blue Giant", creator: "Shinichi Ishizuka", status: "Da leggere", coverClass: "cover-blue" },
  { id: "blame", title: "BLAME!", creator: "Tsutomu Nihei", status: "Da leggere", coverClass: "cover-steel" },
  { id: "bokko", title: "Bokko", creator: "Hideki Mori", status: "Da leggere", coverClass: "cover-ochre" },
  { id: "banana-fish", title: "Banana Fish", creator: "Akimi Yoshida", status: "Da leggere", coverClass: "cover-yellow" },
  { id: "blade", title: "L'immortale", creator: "Hiroaki Samura", status: "Da leggere", coverClass: "cover-rust" },
  { id: "monster", title: "Monster", creator: "Naoki Urasawa", status: "Completato", meta: "Collezione completa", coverClass: "cover-monster" },
  { id: "vagabond", title: "Vagabond", creator: "Takehiko Inoue", status: "In pausa", coverClass: "cover-vagabond" },
  { id: "climber", title: "The Climber", creator: "Shin-ichi Sakamoto", status: "Completato", coverClass: "cover-climber" },
  { id: "tokyo-ghoul", title: "Tokyo Ghoul", creator: "Sui Ishida", status: "Completato", coverClass: "cover-ghoul" },
  { id: "dorohedoro", title: "Dorohedoro", creator: "Q Hayashida", status: "Da leggere", coverClass: "cover-doro" },
  { id: "planetes", title: "Planetes", creator: "Makoto Yukimura", status: "Da leggere", coverClass: "cover-space" },
  { id: "real", title: "Real", creator: "Takehiko Inoue", status: "Da leggere", coverClass: "cover-real" },
  { id: "mushishi", title: "Mushishi", creator: "Yuki Urushibara", status: "Da leggere", coverClass: "cover-moss" },
];

export const demoAnime: DemoItem[] = [
  { id: "vinland", title: "Vinland Saga", creator: "MAPPA", progress: "S2 · Ep. 14", coverClass: "poster-north" },
  { id: "aot", title: "Attack on Titan", creator: "MAPPA", status: "Completato", coverClass: "poster-fire" },
  { id: "cowboy", title: "Cowboy Bebop", creator: "Sunrise", status: "Da vedere", coverClass: "poster-space" },
  { id: "pluto", title: "Pluto", creator: "Studio M2", status: "Completato", coverClass: "poster-blue" },
  { id: "frieren", title: "Frieren", creator: "Madhouse", progress: "S1 · Ep. 19", coverClass: "poster-frieren" },
  { id: "chainsaw", title: "Chainsaw Man", creator: "MAPPA", status: "In pausa", coverClass: "poster-chain" },
  { id: "evangelion", title: "Neon Genesis Evangelion", creator: "Gainax", status: "Completato", coverClass: "poster-eva" },
  { id: "death-note", title: "Death Note", creator: "Madhouse", status: "Completato", coverClass: "poster-note" },
  { id: "monster-anime", title: "Monster", creator: "Madhouse", status: "Completato", coverClass: "poster-monster" },
  { id: "samurai", title: "Samurai Champloo", creator: "Manglobe", status: "Da vedere", coverClass: "poster-samurai" },
];
