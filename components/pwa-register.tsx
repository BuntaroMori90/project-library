"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // L'app continua a funzionare anche se la registrazione PWA fallisce.
    });
  }, []);

  return null;
}
