import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

/**
 * Loads the monorepo-root `.env` so every consumer (Next.js server components,
 * the agent worker, Prisma CLI scripts) resolves `DATABASE_URL` regardless of
 * the process working directory. Existing environment variables win, so real
 * host secrets are never overwritten by a local file.
 */
let loaded = false;

export function ensureEnvLoaded(): void {
  if (loaded) return;
  loaded = true;

  const here = dirname(fileURLToPath(import.meta.url));
  // packages/db/src -> repo root is three levels up.
  const rootEnv = resolve(here, "../../../.env");
  if (existsSync(rootEnv)) {
    loadDotenv({ path: rootEnv, override: false });
  } else {
    loadDotenv({ override: false });
  }
}
