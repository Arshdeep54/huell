import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db, schema } from "@huell/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const existing = db
        .select()
        .from(schema.members)
        .where(eq(schema.members.email, user.email))
        .get();
      if (existing) return true;

      const isFirstMember = db.select().from(schema.members).all().length === 0;

      const pendingInvite = db
        .select()
        .from(schema.invites)
        .where(eq(schema.invites.email, user.email))
        .get();

      if (!isFirstMember && !pendingInvite) return false;

      const memberId = randomUUID();
      db.insert(schema.members)
        .values({
          id: memberId,
          email: user.email,
          name: user.name ?? user.email,
          avatarUrl: user.image ?? null,
          isOrgAdmin: isFirstMember,
          createdAt: new Date(),
        })
        .run();

      if (pendingInvite) {
        db.update(schema.invites)
          .set({ redeemedAt: new Date() })
          .where(eq(schema.invites.id, pendingInvite.id))
          .run();

        // Invited from a project's "Add member" flow: grant that project role too.
        if (pendingInvite.projectId && pendingInvite.role) {
          db.insert(schema.projectMembers)
            .values({
              id: randomUUID(),
              projectId: pendingInvite.projectId,
              memberId,
              role: pendingInvite.role,
              createdAt: new Date(),
            })
            .run();
        }
      }

      return true;
    },
    async session({ session }) {
      if (!session.user?.email) return session;
      const member = db
        .select()
        .from(schema.members)
        .where(eq(schema.members.email, session.user.email))
        .get();
      if (member) {
        session.user.id = member.id;
        session.user.isOrgAdmin = member.isOrgAdmin;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
