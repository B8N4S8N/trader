import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

/**
 * Loads the nearest `.env` by walking up from the current working directory so
 * every consumer (Next.js server components, the agent worker, Prisma scripts)
 * resolves `DATABASE_URL` regardless of where it is launched from. Existing
 * environment variables always win, so real host secrets are never clobbered
 * by a local file.
 */
let loaded = false;

export function ensureEnvLoaded(): void {
  if (loaded) return;
  loaded = true;

  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate, override: false });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  loadDotenv({ override: false });
}
