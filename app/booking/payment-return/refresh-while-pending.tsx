"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 60_000;

// Re-renders the server page (which asks Chapa again) every few seconds for
// about a minute, then stops.
export default function RefreshWhilePending() {
  const router = useRouter();
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        window.clearInterval(interval);
        return;
      }
      router.refresh();
    }, INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [router, startedAt]);

  return null;
}
