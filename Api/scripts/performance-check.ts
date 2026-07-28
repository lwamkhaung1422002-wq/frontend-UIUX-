import "dotenv/config";

import { Client } from "pg";

import { assertLocalDatabaseUrl } from "../src/lib/local-db-guard.js";

type Plan = {
  "Planning Time": number;
  "Execution Time": number;
};

const MAX_QUERY_MS = Number(process.env.PERF_MAX_QUERY_MS || 250);

async function explain(client: Client, label: string, sql: string, parameters: unknown[]): Promise<void> {
  const result = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, parameters);
  const plan = result.rows[0]["QUERY PLAN"][0] as Plan;
  const total = plan["Planning Time"] + plan["Execution Time"];
  if (total > MAX_QUERY_MS) {
    throw new Error(`${label} took ${total.toFixed(2)}ms (limit ${MAX_QUERY_MS}ms).`);
  }
  console.log(`PASS ${label} ${total.toFixed(2)}ms`);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") throw new Error("Performance verification is disabled in production.");
  const databaseUrl = process.env.DATABASE_URL;
  assertLocalDatabaseUrl(databaseUrl);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const demo = await client.query(
      `select id from "Shop" where name like $1 order by "createdAt" asc limit 1`,
      ["% Demo"],
    );
    const shopId = demo.rows[0]?.id as string | undefined;
    if (!shopId) throw new Error("Seed the deterministic eight-store demo before performance verification.");
    const counts = await client.query(`
      select
        (select count(*)::int from "Product") as products,
        (select count(*)::int from "InventoryMovement") as movements,
        (select count(*)::int from "Order") as orders,
        (select count(*)::int from "Purchase") as purchases
    `);
    await explain(client, "tenant product pagination",
      `select id, name, sku from "Product" where "shopId" = $1 and "isActive" = true
       order by "createdAt" desc limit 25`, [shopId]);
    await explain(client, "tenant movement timeline",
      `select id, type, direction, "baseQuantity", "occurredAt" from "InventoryMovement"
       where "shopId" = $1 order by "occurredAt" desc limit 25`, [shopId]);
    await explain(client, "tenant recognized orders",
      `select id, total, "completedAt" from "Order" where "shopId" = $1 and "completedAt" is not null
       order by "completedAt" desc limit 25`, [shopId]);
    await explain(client, "tenant purchase pagination",
      `select id, status, total, "orderedAt" from "Purchase" where "shopId" = $1
       order by "createdAt" desc limit 25`, [shopId]);
    await explain(client, "tenant lot expiry",
      `select id, "lotNumber", "expiresAt" from "InventoryLot"
       where "shopId" = $1 and status = 'ACTIVE' order by "expiresAt" asc nulls last limit 25`, [shopId]);
    console.log(JSON.stringify({ status: "PASS", thresholdMs: MAX_QUERY_MS, rows: counts.rows[0] }));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
