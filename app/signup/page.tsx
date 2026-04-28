import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";

type SignupPageProps = {
  searchParams: { phone?: string };
};
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage({
  searchParams,
}: SignupPageProps): React.JSX.Element {
  const phone = searchParams.phone?.trim() ?? "";

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
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Join the marketplace and start building your receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm initialPhone={phone} />
        </CardContent>
      </Card>
    </div>
  );
}
