import "server-only";
import { Pool, type QueryResultRow } from "pg";

declare global {
  var __projectLibraryPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  });
}

function getPool() {
  if (globalThis.__projectLibraryPool) return globalThis.__projectLibraryPool;

  const pool = createPool();
  if (process.env.NODE_ENV !== "production")
    globalThis.__projectLibraryPool = pool;
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(text, values);
}

export async function withTransaction<T>(
  run: (client: import("pg").PoolClient) => Promise<T>,
) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
