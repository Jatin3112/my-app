import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/",
    "/todos/:path*",
    "/timesheet/:path*",
    "/invite/:path*",
    "/workspace/:path*",
  ],
}
