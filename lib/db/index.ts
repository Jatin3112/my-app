import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Production setup (Neon):
// 1. Create database at https://neon.tech
// 2. Set DATABASE_URL in Vercel env vars to your Neon connection string
// 3. The config below auto-detects remote vs localhost and adjusts SSL + pooling

const connectionString = process.env.DATABASE_URL!;
const isProduction = process.env.NODE_ENV === "production";

// Reuse the same pool across hot reloads in dev mode
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: isProduction ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: isLocalhost, // prepared statements work locally, not through Neon's pooler
    ssl: isLocalhost ? false : "require",
  });

if (!isProduction) {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
