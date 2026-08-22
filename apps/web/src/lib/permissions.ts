import { db, schema, type ProjectRole } from "@doctor/db";
import { and, eq } from "drizzle-orm";

const roleRank: Record<ProjectRole, number> = { viewer: 0, editor: 1, owner: 2 };

export function getProjectRole(memberId: string, projectId: string): ProjectRole | null {
  const row = db
    .select({ role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.memberId, memberId), eq(schema.projectMembers.projectId, projectId)))
    .get();
  return row?.role ?? null;
}

export function hasProjectRole(
  memberId: string,
  projectId: string,
  minRole: ProjectRole,
  isOrgAdmin: boolean,
): boolean {
  if (isOrgAdmin) return true;
  const role = getProjectRole(memberId, projectId);
  if (!role) return false;
  return roleRank[role] >= roleRank[minRole];
}
