import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProfileNotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Profile not found</h1>
      <p className="max-w-md text-muted-foreground">
        That username doesn&apos;t exist on The Receipt yet, or it was removed.
      </p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
