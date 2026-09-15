import type { ReactNode } from "react";
import { MangaCollectorPanel } from "./collector";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function MangaDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      {children}
      {UUID.test(id) ? <MangaCollectorPanel workId={id} /> : null}
    </>
  );
}
