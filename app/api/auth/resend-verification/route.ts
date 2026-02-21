import { NextResponse } from "next/server";
import { resendVerificationEmail } from "@/lib/api/email-verification";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await resendVerificationEmail(email);

    // Always return success to prevent email enumeration
    return NextResponse.json({ message: "If an account exists, a verification email has been sent." });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
