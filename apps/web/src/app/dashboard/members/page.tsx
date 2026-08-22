import { db, schema } from "@doctor/db";
import { requireOrgAdmin } from "@/lib/session";
import { inviteMember, removeMember } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default async function MembersPage() {
  const session = await requireOrgAdmin();
  const members = db.select().from(schema.members).all();
  const pendingInvites = db.select().from(schema.invites).all().filter((i) => !i.redeemedAt);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">
          Invite by email — they sign in with the matching Google account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite someone</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={inviteMember} className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" placeholder="teammate@example.com" required />
            </Field>
            <Button type="submit">Send invite</Button>
          </form>
        </CardContent>
      </Card>

      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invites</CardTitle>
            <CardDescription>Waiting for the invitee to sign in with Google.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="text-sm text-muted-foreground">
                {invite.email}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Org members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.isOrgAdmin ? "default" : "secondary"}>
                      {member.isOrgAdmin ? "Org admin" : "Member"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.id !== session.user.id && (
                      <form action={removeMember}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Remove
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
