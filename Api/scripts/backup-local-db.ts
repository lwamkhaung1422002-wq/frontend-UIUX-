import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { exportDatabase } from "../src/lib/database-backup.js";
import { assertLocalDatabaseUrl } from "../src/lib/local-db-guard.js";
import { prisma } from "../src/lib/prisma.js";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  assertLocalDatabaseUrl(databaseUrl);
  const parsedUrl = new URL(databaseUrl!);

  const backupDir = join(process.cwd(), "local-backups");
  await mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `online-shop-local-${timestamp}.json`);

  const backup = await exportDatabase(prisma, parsedUrl.pathname.slice(1));

  await writeFile(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Local database backup written: ${backupPath} (${Object.keys(backup.tables).length} tables)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
