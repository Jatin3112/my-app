import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcrypt"
import { createWorkspace } from "@/lib/api/workspaces"
import { acceptInvitation } from "@/lib/api/invitations"
import { sendVerificationEmail } from "@/lib/api/email-verification"
import { rateLimit } from "@/lib/api/rate-limit"
import { headers } from "next/headers"

export async function POST(req: Request) {
  try {
    const headerList = await headers()
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

    const rl = rateLimit(`register:${ip}`, 5, 3600000) // 5 per hour
    if (!rl.success) {
      return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 })
    }

    const { email, password, name, inviteToken } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const [newUser] = await db.insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        updated_at: new Date(),
      })
      .returning()

    // Handle invite token or create default workspace
    if (inviteToken) {
      try {
        await acceptInvitation(inviteToken, newUser.id)
      } catch {
        // Invitation failed but user was created — create default workspace instead
        const displayName = name || email.split("@")[0]
        await createWorkspace(newUser.id, { name: `${displayName}'s Workspace` })
      }
    } else {
      // Create default workspace for new user
      const displayName = name || email.split("@")[0]
      await createWorkspace(newUser.id, { name: `${displayName}'s Workspace` })
    }

    // Send verification email
    await sendVerificationEmail(newUser.id)

    return NextResponse.json(
      { message: "Account created! Please check your email to verify your account.", user: { id: newUser.id, email: newUser.email, name: newUser.name }, requiresVerification: true },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
