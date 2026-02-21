import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/dashboard",
    "/todos/:path*",
    "/timesheet/:path*",
    "/projects/:path*",
    "/billing/:path*",
    "/invite/:path*",
    "/workspace/:path*",
  ],
}
