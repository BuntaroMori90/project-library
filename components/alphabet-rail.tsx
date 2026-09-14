const letters = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

export function AlphabetRail() {
  return (
    <aside className="alphabet-rail" aria-label="Indice alfabetico">
      {letters.map((letter) => <a key={letter} href={`#letter-${letter}`}>{letter}</a>)}
    </aside>
  );
}
