import type { ReactNode } from "react";
import { MangaCollectorPanel } from "./collector";

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
      <MangaCollectorPanel workId={id} />
    </>
  );
}
