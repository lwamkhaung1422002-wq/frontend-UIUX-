import { createHash } from "node:crypto";

import type { PrismaClient } from "../generated/prisma/client.js";

export type DatabaseBackup = {
  formatVersion: 1;
  exportedAt: string;
  sourceDatabase: string;
  tableDefinitions: Record<string, Array<{
    name: string;
    dataType: string;
    notNull: boolean;
  }>>;
  tables: Record<string, unknown[]>;
};

type QueryClient = Pick<PrismaClient, "$queryRawUnsafe">;

export async function listApplicationTables(client: QueryClient): Promise<string[]> {
  const rows = await client.$queryRawUnsafe<Array<{ table_name: string }>>(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name <> '_prisma_migrations'
    order by table_name
  `);
  return rows.map((row) => row.table_name);
}

export async function exportDatabase(
  client: QueryClient,
  sourceDatabase: string,
): Promise<DatabaseBackup> {
  const tables: Record<string, unknown[]> = {};
  const tableDefinitions: DatabaseBackup["tableDefinitions"] = {};
  for (const table of await listApplicationTables(client)) {
    tableDefinitions[table] = await client.$queryRawUnsafe<Array<{
      name: string;
      dataType: string;
      notNull: boolean;
    }>>(`
      select
        a.attname as name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as "dataType",
        a.attnotnull as "notNull"
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = $1
        and a.attnum > 0
        and not a.attisdropped
      order by a.attnum
    `, table);
    const rows = await client.$queryRawUnsafe<Array<{ data: unknown }>>(
      `select to_jsonb(t) as data from "${table.replaceAll('"', '""')}" t`,
    );
    tables[table] = rows.map((row) => row.data);
  }
  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    sourceDatabase,
    tableDefinitions,
    tables,
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function canonicalTableRows(rows: unknown[]): string[] {
  return rows
    .map((row) => JSON.stringify(stableValue(row)))
    .sort();
}

export function tableDigest(rows: unknown[]): string {
  return createHash("sha256").update(canonicalTableRows(rows).join("\n")).digest("hex");
}
