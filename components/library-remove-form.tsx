"use client";

import { Trash2 } from "lucide-react";
import { removeWorkFromLibraryAction } from "@/app/library/remove-actions";
import type { RemovableMediaType } from "@/lib/repositories/remove-library";

export function LibraryRemoveForm({
  workId,
  title,
  mediaType,
}: {
  workId: string;
  title: string;
  mediaType: RemovableMediaType;
}) {
  const destination = mediaType === "ANIME" ? "videoteca" : "libreria";

  return (
    <form
      action={removeWorkFromLibraryAction}
      className="book-delete-form"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Rimuovere “${title}” dalla tua ${destination}? Stato, progresso e dati personali verranno rimossi. L'opera resterà nel catalogo.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="mediaType" value={mediaType} />
      <button type="submit" className="book-delete-button">
        <Trash2 size={17} />
        <span>Rimuovi dalla {destination}</span>
      </button>
    </form>
  );
}
