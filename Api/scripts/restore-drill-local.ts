import "dotenv/config";

import { spawn } from "node:child_process";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";

import { PrismaClient } from "../src/generated/prisma/client.js";
import { canonicalTableRows, exportDatabase, tableDigest } from "../src/lib/database-backup.js";
import { assertLocalDatabaseUrl } from "../src/lib/local-db-guard.js";
import { prisma } from "../src/lib/prisma.js";

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Restore drill is disabled in production.");
  }
  if (process.env.CONFIRM_RESTORE_DRILL !== "isolated-local-database") {
    throw new Error("Set CONFIRM_RESTORE_DRILL=isolated-local-database to run the guarded restore drill.");
  }

  const sourceUrl = process.env.DATABASE_URL;
  assertLocalDatabaseUrl(sourceUrl);
  const parsedSource = new URL(sourceUrl!);
  const sourceDatabase = parsedSource.pathname.slice(1);
  if (!/(local|test|dev)/i.test(sourceDatabase)) {
    throw new Error(`Restore drill source database must contain local, test, or dev: ${sourceDatabase}`);
  }

  const suffix = `${Date.now()}_${process.pid}`;
  const drillDatabase = `greenmart_restore_drill_${suffix}`;
  const adminUrl = new URL(sourceUrl!);
  adminUrl.pathname = "/postgres";
  const drillUrl = new URL(sourceUrl!);
  drillUrl.pathname = `/${drillDatabase}`;
  const admin = new Client({ connectionString: adminUrl.toString() });
  const sourceBackup = await exportDatabase(prisma, sourceDatabase);

  await admin.connect();
  try {
    await admin.query(`create database "${drillDatabase}"`);
    await run(
      process.execPath,
      [join(process.cwd(), "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
      { ...process.env, DATABASE_URL: drillUrl.toString() },
    );

    const restoreClient = new Client({ connectionString: drillUrl.toString() });
    await restoreClient.connect();
    try {
      const migratedTableRows = await restoreClient.query<{ table_name: string }>(`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_type = 'BASE TABLE'
          and table_name <> '_prisma_migrations'
      `);
      const migratedTables = new Set(migratedTableRows.rows.map((row) => row.table_name));
      if (migratedTables.size > 0) {
        const truncateTargets = [...migratedTables]
          .map((table) => `"${table.replaceAll('"', '""')}"`)
          .join(", ");
        await restoreClient.query(`truncate table ${truncateTargets} cascade`);
      }
      for (const [table, columns] of Object.entries(sourceBackup.tableDefinitions)) {
        const escapedTable = table.replaceAll('"', '""');
        if (migratedTables.has(table)) {
          const targetColumnRows = await restoreClient.query<{ column_name: string }>(`
            select column_name
            from information_schema.columns
            where table_schema = 'public' and table_name = $1
          `, [table]);
          const targetColumns = new Set(targetColumnRows.rows.map((row) => row.column_name));
          for (const column of columns) {
            if (targetColumns.has(column.name)) continue;
            const escapedColumn = column.name.replaceAll('"', '""');
            await restoreClient.query(
              `alter table "${escapedTable}" add column "${escapedColumn}" ${column.dataType}${column.notNull ? " not null" : ""}`,
            );
          }
          continue;
        }
        const columnSql = columns.map((column) => {
          const escapedColumn = column.name.replaceAll('"', '""');
          return `"${escapedColumn}" ${column.dataType}${column.notNull ? " not null" : ""}`;
        }).join(", ");
        await restoreClient.query(`create table "${escapedTable}" (${columnSql})`);
      }
      await restoreClient.query("begin");
      await restoreClient.query("set local session_replication_role = replica");
      for (const [table, rows] of Object.entries(sourceBackup.tables)) {
        if (rows.length === 0) continue;
        const escapedTable = table.replaceAll('"', '""');
        await restoreClient.query(
          `insert into "${escapedTable}" select * from json_populate_recordset(null::"${escapedTable}", $1::json)`,
          [JSON.stringify(rows)],
        );
      }
      await restoreClient.query("commit");
    } catch (error) {
      await restoreClient.query("rollback");
      throw error;
    } finally {
      await restoreClient.end();
    }

    const restoredPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: drillUrl.toString() }),
    });
    try {
      const restoredBackup = await exportDatabase(restoredPrisma, drillDatabase);
      const differences = Object.entries(sourceBackup.tables).flatMap(([table, rows]) => {
        const restoredRows = restoredBackup.tables[table] ?? [];
        if (rows.length === restoredRows.length && tableDigest(rows) === tableDigest(restoredRows)) return [];
        const sourceCanonical = canonicalTableRows(rows);
        const restoredCanonical = canonicalTableRows(restoredRows);
        const mismatchIndex = sourceCanonical.findIndex((row, index) => row !== restoredCanonical[index]);
        return [{
          table,
          sourceRows: rows.length,
          restoredRows: restoredRows.length,
          sourceSample: sourceCanonical[mismatchIndex]?.slice(0, 500),
          restoredSample: restoredCanonical[mismatchIndex]?.slice(0, 500),
        }];
      });
      if (differences.length > 0) {
        throw new Error(`Restore verification failed: ${JSON.stringify(differences)}`);
      }
      console.log(JSON.stringify({
        status: "PASS",
        sourceDatabase,
        restoredDatabase: drillDatabase,
        tables: Object.keys(sourceBackup.tables).length,
        rows: Object.values(sourceBackup.tables).reduce((total, rows) => total + rows.length, 0),
        differences: 0,
      }));
    } finally {
      await restoredPrisma.$disconnect();
    }
  } finally {
    await admin.query(
      `drop database if exists "${drillDatabase}" with (force)`,
    ).catch(() => undefined);
    await admin.end();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
