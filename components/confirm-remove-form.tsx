"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

type RemovalResult = { error: string } | void;

export function ConfirmRemoveForm({ action, title, destination, fields, consequences }: {
  action: (data: FormData) => Promise<RemovalResult>;
  title: string;
  destination: string;
  fields: Record<string, string>;
  consequences: string;
}) {
  const [state, submit, pending] = useActionState(async (_previous: RemovalResult, data: FormData) => {
    try { return await action(data); }
    catch { return { error: "Rimozione non confermata. Ricarica la scheda per verificarne lo stato prima di riprovare." }; }
  }, undefined);

  return <form action={submit} className="book-delete-form" aria-busy={pending}
    onSubmit={(event) => {
      if (pending || !window.confirm(`Rimuovere “${title}” dalla tua ${destination}? ${consequences} L’opera resterà nel catalogo. Questa rimozione non è ancora recuperabile dal cestino.`)) event.preventDefault();
    }}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <button type="submit" className="book-delete-button" disabled={pending}>
      <Trash2 size={17} aria-hidden="true" /><span>{pending ? "Rimuovo…" : `Rimuovi dalla ${destination}`}</span>
    </button>
    {state?.error ? <p role="alert" className="catalog-error">{state.error}</p> : null}
  </form>;
}
