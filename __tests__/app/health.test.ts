import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { execute: vi.fn() },
}));

import { db } from "@/lib/db";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with ok status when database is connected", async () => {
    vi.mocked(db.execute).mockResolvedValue([] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.db).toBe("connected");
    expect(data.timestamp).toBeDefined();
  });

  it("returns 503 with error status when database is disconnected", async () => {
    vi.mocked(db.execute).mockRejectedValue(new Error("Connection refused"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("error");
    expect(data.db).toBe("disconnected");
    expect(data.error).toBe("Connection refused");
    expect(data.timestamp).toBeDefined();
  });
});
