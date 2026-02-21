import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await db.execute(sql`SELECT 1`);

    return NextResponse.json(
      { status: "ok", timestamp, db: "connected" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp,
        db: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
