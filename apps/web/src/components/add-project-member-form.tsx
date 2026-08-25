"use client";

import { useActionState, useEffect, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import { inviteMember, type AddProjectMemberState } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";

export function AddProjectMemberForm({
  action,
  projectId,
  orgDomain,
}: {
  action: (prevState: AddProjectMemberState, formData: FormData) => Promise<AddProjectMemberState>;
  projectId: string;
  orgDomain: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [dialogEmail, setDialogEmail] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (state?.notOrgMember && state.email) setDialogEmail(state.email);
  }, [state]);

  async function handleInvite() {
    if (!dialogEmail) return;
    setInviting(true);
    try {
      const formData = new FormData();
      formData.set("email", dialogEmail);
      formData.set("projectId", projectId);
      formData.set("role", state?.role ?? "viewer");
      await inviteMember(formData);
      toast.success(`Invited ${dialogEmail} to ${orgDomain} — they'll join this project as ${state?.role ?? "viewer"} once they sign in.`);
      setDialogEmail(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send the invite.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <>
      <form action={formAction} style={{ padding: "13px 19px", display: "flex", alignItems: "center", gap: 9 }}>
        <input
          name="email"
          type="email"
          placeholder="teammate@example.com"
          required
          style={{
            flex: 1,
            minWidth: 0,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--line2)",
            background: "var(--bg)",
            color: "var(--fg)",
            padding: "0 10px",
            font: "400 12px/1 'IBM Plex Mono', monospace",
          }}
        />
        <select
          name="role"
          defaultValue="viewer"
          style={{
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--line2)",
            background: "var(--bg)",
            color: "var(--fg)",
            padding: "0 8px",
            font: "400 12px/1 'IBM Plex Mono', monospace",
          }}
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="owner">Owner</option>
        </select>
        <SubmitButton
          pendingLabel="Adding…"
          className="hover-fg3-line"
          style={{
            height: 32,
            padding: "0 12px",
            border: "1px solid var(--line2)",
            borderRadius: 8,
            background: "transparent",
            color: "var(--fg)",
            font: "500 12px/1 'IBM Plex Sans', sans-serif",
            flex: "none",
          }}
        >
          Add
        </SubmitButton>
      </form>

      {state?.error && (
        <div style={{ padding: "0 19px 13px", font: "400 12px/1.5 'IBM Plex Sans', sans-serif", color: "var(--bad)" }}>
          {state.error}
        </div>
      )}

      <DialogPrimitive.Root open={dialogEmail !== null} onOpenChange={(open) => !open && setDialogEmail(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            style={{ position: "fixed", inset: 0, background: "oklch(0 0 0 / 50%)", zIndex: 50 }}
          />
          <DialogPrimitive.Popup
            className="animate-rise"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              maxWidth: 420,
              background: "var(--bg2)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 26,
              boxShadow: "var(--dc-shadow)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              outline: "none",
            }}
          >
            <div>
              <DialogPrimitive.Title style={{ font: "600 16px/1.3 'IBM Plex Sans', sans-serif" }}>
                Not in the org yet
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                style={{
                  font: "400 13px/1.6 'IBM Plex Sans', sans-serif",
                  color: "var(--fg2)",
                  marginTop: 8,
                  textWrap: "pretty",
                }}
              >
                <span style={{ font: "500 12.5px/1 'IBM Plex Mono', monospace", color: "var(--fg)" }}>
                  {dialogEmail}
                </span>{" "}
                isn&apos;t a member of {orgDomain}, so they can&apos;t be added to this project directly.
                <br />
                <br />
                Invite them to the org — once they sign in, they&apos;ll automatically join this project as{" "}
                <strong style={{ color: "var(--fg)" }}>{state?.role ?? "viewer"}</strong>.
              </DialogPrimitive.Description>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setDialogEmail(null)}
                className="hover-fg"
                style={{
                  height: 34,
                  padding: "0 14px",
                  border: "1px solid var(--line2)",
                  borderRadius: 9,
                  background: "transparent",
                  color: "var(--fg)",
                  font: "500 12.5px/1 'IBM Plex Sans', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting}
                className="hover-brighten"
                style={{
                  height: 34,
                  padding: "0 14px",
                  border: "none",
                  borderRadius: 9,
                  background: "var(--acc)",
                  color: "var(--accfg)",
                  font: "600 12.5px/1 'IBM Plex Sans', sans-serif",
                  opacity: inviting ? 0.6 : 1,
                }}
              >
                {inviting ? "Inviting…" : "Invite to org"}
              </button>
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="hover-fg"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                border: "none",
                background: "transparent",
                color: "var(--fg3)",
                display: "flex",
              }}
            >
              <XIcon size={16} />
            </DialogPrimitive.Close>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
