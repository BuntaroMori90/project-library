"use client";

import { Trash2 } from "lucide-react";
import { removeBookFromLibraryAction } from "@/app/library/books/[id]/actions";

export function BookDeleteForm({
  workId,
  title,
}: {
  workId: string;
  title: string;
}) {
  return (
    <form
      action={removeBookFromLibraryAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Rimuovere “${title}” dalla tua libreria? Il catalogo dell'opera non verrà cancellato.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="workId" value={workId} />
      <button type="submit" className="wishlist-remove">
        <Trash2 size={17} />
        <span>Rimuovi dalla libreria</span>
      </button>
    </form>
  );
}
