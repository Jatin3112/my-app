import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { db } from "@/lib/db"
import { users, accounts } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import bcrypt from "bcrypt"
import type { NextAuthOptions } from "next-auth"
import { createWorkspace } from "@/lib/api/workspaces"

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        })

        if (!user) {
          return null
        }

        // OAuth-only user trying to login with credentials
        if (!user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Credentials path: check email verification
      if (account?.provider === "credentials") {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email!),
        })

        if (dbUser && !dbUser.email_verified) {
          return `/login?error=EmailNotVerified&email=${encodeURIComponent(user.email!)}`
        }

        return true
      }

      // OAuth path (Google/GitHub)
      if (account?.provider && account.provider !== "credentials") {
        const provider = account.provider
        const providerAccountId = account.providerAccountId

        // 1. Check if this OAuth account is already linked
        const existingAccount = await db.query.accounts.findFirst({
          where: and(
            eq(accounts.provider, provider),
            eq(accounts.provider_account_id, providerAccountId),
          ),
        })

        if (existingAccount) {
          // Already linked — set user.id for JWT callback
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, existingAccount.user_id),
          })
          if (dbUser) {
            user.id = dbUser.id
          }
          return true
        }

        // 2. Check if a user with this email already exists (account linking)
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email!),
        })

        if (existingUser) {
          // Link OAuth account to existing user
          await db.insert(accounts).values({
            user_id: existingUser.id,
            provider,
            provider_account_id: providerAccountId,
            access_token: account.access_token as string | undefined,
            refresh_token: account.refresh_token as string | undefined,
            token_type: account.token_type as string | undefined,
            scope: account.scope as string | undefined,
            id_token: account.id_token as string | undefined,
            expires_at: account.expires_at as number | undefined,
          })

          // Auto-verify email for OAuth users
          if (!existingUser.email_verified) {
            await db.update(users).set({
              email_verified: new Date(),
              image: user.image || existingUser.image,
              updated_at: new Date(),
            }).where(eq(users.id, existingUser.id))
          }

          user.id = existingUser.id
          return true
        }

        // 3. Create new user + workspace + account
        const [newUser] = await db.insert(users).values({
          email: user.email!,
          name: user.name,
          image: user.image,
          email_verified: new Date(),
          updated_at: new Date(),
        }).returning()

        await db.insert(accounts).values({
          user_id: newUser.id,
          provider,
          provider_account_id: providerAccountId,
          access_token: account.access_token as string | undefined,
          refresh_token: account.refresh_token as string | undefined,
          token_type: account.token_type as string | undefined,
          scope: account.scope as string | undefined,
          id_token: account.id_token as string | undefined,
          expires_at: account.expires_at as number | undefined,
        })

        const displayName = newUser.name || newUser.email.split("@")[0]
        await createWorkspace(newUser.id, { name: `${displayName}'s Workspace` })

        user.id = newUser.id
        return true
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
