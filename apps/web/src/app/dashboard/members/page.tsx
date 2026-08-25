import { db, schema } from "@doctor/db";
import { requireOrgAdmin } from "@/lib/session";
import { inviteMember, removeMember } from "@/lib/actions";
import { formatRelativeTime } from "@/lib/format";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function MembersPage() {
  const session = await requireOrgAdmin();
  const members = db.select().from(schema.members).all();
  const pendingInvites = db.select().from(schema.invites).all().filter((i) => !i.redeemedAt);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, font: "600 22px/1.2 'IBM Plex Sans', sans-serif", letterSpacing: "-0.015em" }}>
            Members
          </h1>
          <p style={{ margin: "7px 0 0", font: "400 13px/1.5 'IBM Plex Sans', sans-serif", color: "var(--fg2)" }}>
            Org&#8209;wide access. Invite by email — they sign in with the matching Google account.
          </p>
        </div>
        <form action={inviteMember} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
          <input
            name="email"
            type="email"
            placeholder="teammate@example.com"
            required
            style={{
              width: 230,
              height: 36,
              borderRadius: 9,
              border: "1px solid var(--line2)",
              background: "var(--bg2)",
              color: "var(--fg)",
              padding: "0 12px",
              font: "400 12.5px/1 'IBM Plex Mono', monospace",
            }}
          />
          <button
            type="submit"
            style={{
              height: 36,
              padding: "0 14px",
              border: "none",
              borderRadius: 9,
              background: "var(--acc)",
              color: "var(--accfg)",
              font: "600 12.5px/1 'IBM Plex Sans', sans-serif",
            }}
          >
            Invite
          </button>
        </form>
      </div>

      <div
        style={{
          marginTop: 24,
          border: "1px solid var(--line)",
          borderRadius: 14,
          background: "var(--bg2)",
          boxShadow: "var(--dc-shadow)",
          overflow: "hidden",
        }}
      >
        {members.map((member) => (
          <div
            key={member.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px,1.1fr) 130px 90px",
              alignItems: "center",
              gap: 16,
              padding: "14px 20px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: member.isOrgAdmin ? "var(--accsoft)" : "var(--bg3)",
                  color: member.isOrgAdmin ? "var(--acc)" : "var(--fg2)",
                  display: "grid",
                  placeItems: "center",
                  font: "600 11px/1 'IBM Plex Mono', monospace",
                  flex: "none",
                }}
              >
                {initialsOf(member.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ font: "500 13px/1.2 'IBM Plex Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {member.name}
                </div>
                <div style={{ font: "400 11px/1.4 'IBM Plex Mono', monospace", color: "var(--fg3)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {member.email}
                </div>
              </div>
            </div>
            <span
              style={{
                font: "500 10.5px/1 'IBM Plex Mono', monospace",
                color: member.isOrgAdmin ? "var(--accfg)" : "var(--fg2)",
                background: member.isOrgAdmin ? "var(--acc)" : "var(--bg3)",
                padding: "5px 9px",
                borderRadius: 6,
                justifySelf: "start",
              }}
            >
              {member.isOrgAdmin ? "org admin" : "member"}
            </span>
            {member.id !== session.user.id ? (
              <form action={removeMember} style={{ justifySelf: "end" }}>
                <input type="hidden" name="memberId" value={member.id} />
                <button type="submit" style={{ border: "none", background: "transparent", color: "var(--fg3)", font: "500 11.5px/1 'IBM Plex Sans', sans-serif" }}>
                  Remove
                </button>
              </form>
            ) : (
              <span />
            )}
          </div>
        ))}

        {pendingInvites.map((invite) => (
          <div
            key={invite.id}
            style={{
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--bg3)",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--acc)" }} />
            <span style={{ font: "400 12.5px/1.4 'IBM Plex Mono', monospace", color: "var(--fg2)" }}>{invite.email}</span>
            <span style={{ font: "500 10.5px/1 'IBM Plex Mono', monospace", color: "var(--acc)", background: "var(--accsoft)", padding: "4px 8px", borderRadius: 6 }}>
              invite pending
            </span>
            <span style={{ font: "400 11.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
              sent {formatRelativeTime(invite.createdAt)} · not signed in yet
            </span>
          </div>
        ))}
      </div>
      <p style={{ margin: "16px 0 0", font: "400 11.5px/1.7 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
        Removing someone from the org removes them from every project. Org admin is granted here; per&#8209;project
        owner/editor/viewer is set on the project.
      </p>
    </div>
  );
}
