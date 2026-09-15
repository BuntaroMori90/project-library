import type { ReactNode } from "react";
import { LibraryRemovePanel } from "@/components/library-remove-panel";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AnimeDetailLayout({
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
      {UUID.test(id) ? <LibraryRemovePanel workId={id} mediaType="ANIME" /> : null}
    </>
  );
}
