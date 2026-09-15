import "server-only";
import { Pool, type QueryResultRow } from "pg";

declare global {
  var __projectLibraryPool: Pool | undefined;
}

function normalizeConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");

    if (["prefer", "require", "verify-ca"].includes(sslMode ?? "")) {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  return new Pool({
    connectionString: normalizeConnectionString(connectionString),
    max: process.env.NODE_ENV === "production" ? 4 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

function getPool() {
  if (!globalThis.__projectLibraryPool) {
    globalThis.__projectLibraryPool = createPool();
  }
  return globalThis.__projectLibraryPool;
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
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original database error if the connection is already gone.
    }
    throw error;
  } finally {
    client.release();
  }
}
