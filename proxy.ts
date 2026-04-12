import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Edge middleware — kept minimal to prevent redirect loops.
 *
 * Auth checks for /dashboard and /admin are handled by their own
 * server-component layouts (which call auth() in the Node runtime
 * where session resolution is reliable). This middleware used to
 * duplicate those checks in the Edge runtime, but Safari + Vercel
 * Edge can produce stale/missing JWT cookies during rapid redirects,
 * causing an infinite /login → /dashboard → /login loop.
 *
 * The middleware now only runs to keep the auth session warm and to
 * attach any cookies NextAuth needs — it never issues its own
 * redirects.
 */
export default auth(() => {
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)"],
};
