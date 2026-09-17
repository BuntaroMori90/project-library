"use client";

import { useActionState, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ThemedConfirmDialog } from "@/components/themed-confirm-dialog";

type RemovalResult = { error: string } | void;

export function ConfirmRemoveForm({ action, title, destination, fields, consequences }: {
  action: (data: FormData) => Promise<RemovalResult>;
  title: string;
  destination: string;
  fields: Record<string, string>;
  consequences: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [state, submit, pending] = useActionState(async (_previous: RemovalResult, data: FormData) => {
    try { return await action(data); }
    catch { return { error: "Rimozione non confermata. Ricarica la scheda per verificarne lo stato prima di riprovare." }; }
  }, undefined);

  return <>
    <form ref={formRef} action={submit} className="book-delete-form" aria-busy={pending}>
      {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <button
        type="button"
        className="book-delete-button"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={17} aria-hidden="true" /><span>{pending ? "Rimuovo…" : `Rimuovi dalla ${destination}`}</span>
      </button>
      {state?.error ? <p role="alert" className="catalog-error">{state.error}</p> : null}
    </form>
    <ThemedConfirmDialog
      open={confirming}
      title={`Rimuovere “${title}”?`}
      description={`${consequences} L’opera resterà nel catalogo. Questa rimozione non è ancora recuperabile dal cestino.`}
      confirmLabel={`Rimuovi dalla ${destination}`}
      pending={pending}
      error={state?.error ?? null}
      onCancel={() => {
        if (!pending) setConfirming(false);
      }}
      onConfirm={() => {
        setConfirming(false);
        formRef.current?.requestSubmit();
      }}
    />
  </>;
}
