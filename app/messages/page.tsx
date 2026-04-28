import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MessagesPage(): Promise<React.JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/messages");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-16 text-center sm:py-24">
      <h1 className="text-3xl font-black tracking-tight">Messages</h1>
      <p className="text-pretty text-sm text-muted-foreground">
        Direct messaging is coming soon. For now, listings and ratings carry
        the conversation — check your notifications so you don&apos;t miss a
        ping.
      </p>
      <Button asChild variant="outline" className="border-primary/40">
        <Link href="/notifications">Open notifications</Link>
      </Button>
    </div>
  );
}
