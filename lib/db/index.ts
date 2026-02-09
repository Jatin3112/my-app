import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const isProduction = process.env.NODE_ENV === "production";

// Reuse the same pool across hot reloads in dev mode
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: isProduction ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: !isProduction, // disable prepared statements for Neon pooling in prod
    ssl: isProduction ? "require" : false,
  });

if (!isProduction) {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
