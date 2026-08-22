import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireOrgAdmin() {
  const session = await requireSession();
  if (!session.user.isOrgAdmin) redirect("/dashboard");
  return session;
}
