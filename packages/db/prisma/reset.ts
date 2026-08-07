import { prisma } from "../src/index.js";

/**
 * Clears transactional data (trades, orders, signals, positions, snapshots,
 * audit) while preserving the schema and reference rows (accounts, strategies).
 * Used to restart a paper simulation from a clean ledger without a full
 * schema-destroying reset.
 */
async function main(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Trade","Order","Signal","Position","PortfolioSnapshot","AuditLog" RESTART IDENTITY CASCADE;',
  );
  console.log("[reset] transactional tables cleared (schema + reference data kept)");
}

main()
  .catch((err) => {
    console.error("[reset] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
