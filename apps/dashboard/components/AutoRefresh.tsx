"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Periodically re-fetches server components so the public dashboard reflects
 * new agent activity without a manual reload. Read-only: it only calls
 * `router.refresh()`.
 */
export function AutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <span className="pill bg-gain/10 text-gain">
      <span
        className={`h-2 w-2 rounded-full bg-gain transition-opacity ${
          pulse ? "opacity-40" : "opacity-100"
        }`}
      />
      Live
    </span>
  );
}
