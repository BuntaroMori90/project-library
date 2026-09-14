"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }
  return <button className="nav-link" onClick={() => void signOut()}>Esci</button>;
}
