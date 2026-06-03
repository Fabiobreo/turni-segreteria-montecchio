"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/manager/actions";

/** Al montaggio segna le notifiche come lette, così il badge sparisce. */
export function MarkNotificationsRead() {
  const router = useRouter();
  useEffect(() => {
    let done = false;
    markNotificationsRead().then(() => {
      if (!done) router.refresh();
    });
    return () => {
      done = true;
    };
    // eseguito una sola volta all'apertura della pagina
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
