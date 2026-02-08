import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcrypt"
import { createWorkspace } from "@/lib/api/workspaces"
import { acceptInvitation } from "@/lib/api/invitations"

export async function POST(req: Request) {
  try {
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

    return NextResponse.json(
      { message: "User created successfully", user: { id: newUser.id, email: newUser.email, name: newUser.name } },
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
