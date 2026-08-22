export { auth as middleware } from "@/auth";

// Self-hosted, single Node process — no Edge runtime involved, and auth's
// callbacks query SQLite directly (a native module Edge can't run anyway).
export const runtime = "nodejs";

export const config = {
  matcher: ["/dashboard/:path*"],
};
