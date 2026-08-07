import { PrismaClient } from "@prisma/client";
import { ensureEnvLoaded } from "./env.js";

ensureEnvLoaded();

/**
 * Singleton PrismaClient. Reused across hot-reloads in Next.js dev and shared
 * by the agent process so we never exhaust the Postgres connection pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { ensureEnvLoaded } from "./env.js";
export * from "@prisma/client";
export { Prisma, PrismaClient } from "@prisma/client";
