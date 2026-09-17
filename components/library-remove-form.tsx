"use client";
import { removeWorkFromLibraryAction } from "@/app/library/remove-actions";
import type { RemovableMediaType } from "@/lib/repositories/remove-library";
import { ConfirmRemoveForm } from "@/components/confirm-remove-form";

export function LibraryRemoveForm({ workId, title, mediaType }: { workId: string; title: string; mediaType: RemovableMediaType }) {
  return <ConfirmRemoveForm action={removeWorkFromLibraryAction} title={title}
    destination={mediaType === "ANIME" ? "videoteca" : "libreria"}
    fields={{ workId, mediaType }}
    consequences="Verranno rimossi stato, progresso, preferito, note e tutti i dati di possesso di questa opera." />;
}
