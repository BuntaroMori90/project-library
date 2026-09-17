"use client";
import { removeBookFromLibraryAction } from "@/app/library/books/[id]/actions";
import { ConfirmRemoveForm } from "@/components/confirm-remove-form";

export function BookDeleteForm({ workId, title }: { workId: string; title: string }) {
  return <ConfirmRemoveForm action={removeBookFromLibraryAction} title={title} destination="libreria"
    fields={{ workId }} consequences="Verranno rimossi stato, progresso, preferito, note e tutte le copie personali di questo libro." />;
}
