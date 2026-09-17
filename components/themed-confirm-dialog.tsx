"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function ThemedConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  pending = false,
  error,
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  error?: string | null;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => cancelRef.current?.focus(), 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, pending, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="app-confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <section
        className={`app-confirm-dialog ${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-confirm-title"
        aria-describedby="app-confirm-description"
      >
        <div className="app-confirm-heading">
          <span className="app-confirm-icon" aria-hidden="true">
            <AlertTriangle size={20} />
          </span>
          <div>
            <span className="eyebrow">Conferma azione</span>
            <h2 id="app-confirm-title">{title}</h2>
          </div>
          <button
            type="button"
            className="app-confirm-close"
            aria-label="Chiudi"
            disabled={pending}
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </div>
        <p id="app-confirm-description" className="app-confirm-description">
          {description}
        </p>
        {error ? <p className="app-confirm-error" role="alert">{error}</p> : null}
        <div className="app-confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="app-confirm-cancel"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="app-confirm-primary"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Operazione in corso…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
