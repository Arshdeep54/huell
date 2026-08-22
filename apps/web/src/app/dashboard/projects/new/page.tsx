import { createProject } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function NewProjectPage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New project</CardTitle>
          <CardDescription>
            A project becomes a docs site at its own subdomain once a GitHub repo is connected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProject}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Project name</FieldLabel>
                <Input id="name" name="name" placeholder="Vector DB" required autoFocus />
                <FieldDescription>Used to derive the subdomain, e.g. vector-db.docs.your-org.com</FieldDescription>
              </Field>
              <Button type="submit">Create project</Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
