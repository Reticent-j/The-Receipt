import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        ← Back to The Receipt
      </Link>
      <Card className="w-full max-w-md border-border/80 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Use the email and password you registered with.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
