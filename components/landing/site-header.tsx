import Link from "next/link";

import { Button } from "@/components/ui/button";

export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
            R
          </span>
          <span>The Receipt</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" asChild className="hidden text-foreground sm:inline-flex">
            <Link href="/feed">Marketplace</Link>
          </Button>
          <Button variant="ghost" asChild className="text-foreground">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
