import Link from "next/link";

import { HowItWorksDialog } from "@/components/landing/how-it-works-dialog";
import { SiteHeader } from "@/components/landing/site-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, hsl(43 96% 56% / 0.12), transparent 45%),
            radial-gradient(circle at 80% 0%, hsl(43 96% 56% / 0.08), transparent 40%),
            linear-gradient(to bottom, hsl(240 6% 8%), hsl(240 6% 6%))`,
        }}
      />
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-4 py-16 sm:px-6 sm:py-24">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="border border-primary/30">
              Double-blind
            </Badge>
            <Badge variant="secondary" className="border border-primary/30">
              Mutual ratings
            </Badge>
            <Badge variant="secondary" className="border border-primary/30">
              Public receipt
            </Badge>
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Your reputation,{" "}
            <span className="text-primary">verified by real exchanges</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            The Receipt is a marketplace where every profile shows public scores
            built from blind, two-sided ratings with people you&apos;ve actually
            dealt with—not bots, not vibes, not one-sided reviews.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="w-full min-w-[200px] sm:w-auto">
              <Link href="/signup">Sign up</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full min-w-[200px] border-primary/50 sm:w-auto"
            >
              <Link href="/login">Log in</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="w-full min-w-[200px] border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 sm:w-auto"
            >
              <Link href="/feed">Browse marketplace</Link>
            </Button>
          </div>
          <div className="mt-8">
            <HowItWorksDialog />
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Card className="border-border/80 bg-card/60">
            <CardHeader>
              <CardTitle className="text-lg">Blind until both commit</CardTitle>
              <CardDescription>
                You rate the exchange; they rate it too. Scores unlock only when
                both sides have submitted—so neither party can chase the
                other&apos;s number.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/80 bg-card/60">
            <CardHeader>
              <CardTitle className="text-lg">From people in your life</CardTitle>
              <CardDescription>
                Signals come from counterparties you transact with on The
                Receipt—colleagues, clients, collaborators—not anonymous drive-bys.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/80 bg-card/60">
            <CardHeader>
              <CardTitle className="text-lg">A profile you can show</CardTitle>
              <CardDescription>
                Your public receipt aggregates those mutual ratings into scores
                you can stand behind in the marketplace and beyond.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card/40 p-8 sm:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Preview: how a receipt reads in public
              </h2>
              <p className="text-muted-foreground">
                Profiles surface aggregate reputation—not individual comments—so
                the story stays fair and focused on verified interactions.
              </p>
            </div>
            <Card className="w-full max-w-sm shrink-0 border-primary/25 bg-background/80">
              <CardContent className="flex items-center gap-4 pt-6">
                <Avatar className="h-14 w-14 border-2 border-primary/40">
                  <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
                    AR
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Alex Rivera</p>
                  <p className="text-sm text-muted-foreground">
                    Mutual ratings · 48 exchanges
                  </p>
                  <p className="mt-2 text-2xl font-bold text-primary">4.9</p>
                  <p className="text-xs text-muted-foreground">
                    Illustrative mock; connect Supabase to persist real data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} The Receipt · Built with Next.js & Supabase
      </footer>
    </div>
  );
}
