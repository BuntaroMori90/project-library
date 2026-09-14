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
      className="book-delete-form"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Rimuovere “${title}” dalla tua libreria? Stato, progresso e copie possedute verranno rimossi. L'opera resterà nel catalogo.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="workId" value={workId} />
      <button type="submit" className="book-delete-button">
        <Trash2 size={17} />
        <span>Rimuovi dalla libreria</span>
      </button>
    </form>
  );
}
