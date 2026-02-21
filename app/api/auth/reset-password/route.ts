import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/api/password-reset";
import { rateLimit } from "@/lib/api/rate-limit"
import { headers } from "next/headers"

export async function POST(req: Request) {
  try {
    const headerList = await headers()
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

    const rl = rateLimit(`reset:${ip}`, 5, 900000) // 5 per 15 min
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const result = await resetPassword(token, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
