"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { LogOut, Menu, Settings, User } from "lucide-react";

import type { NavProfile } from "@/components/layout/app-chrome";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useClickOutside } from "@/lib/use-click-outside";
import { cn } from "@/lib/utils";

type NavbarProps = {
  userId: string | null;
  profile: NavProfile;
};

function initials(p: NonNullable<NavProfile>): string {
  const fromName = p.full_name?.trim();
  if (fromName) {
    const parts = fromName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return fromName.slice(0, 2).toUpperCase();
  }
  return p.username.slice(0, 2).toUpperCase();
}

export function Navbar({ userId, profile }: NavbarProps): React.JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const desktopUserRef = useRef<HTMLDivElement>(null);

  useClickOutside(desktopUserRef, () => setUserMenuOpen(false), userMenuOpen);

  const profileHref = profile
    ? `/profile/${encodeURIComponent(profile.username)}`
    : "/settings";

  const navClass = (href: string): string =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    );

  async function signOut(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const mainLinks = (
    <>
      <Link href="/feed" className={navClass("/feed")}>
        Feed
      </Link>
      <Link href={profileHref} className={navClass(profileHref)}>
        My Profile
      </Link>
      <Link href="/notifications" className={navClass("/notifications")}>
        Notifications
      </Link>
      <Link href="/premium" className={navClass("/premium")}>
        Premium
      </Link>
      <Link href="/listings/new" className={navClass("/listings/new")}>
        Post Listing
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link
          href={userId ? "/feed" : "/"}
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-foreground"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-amber-400 text-xs font-black text-primary-foreground shadow-md shadow-primary/25">
            R
          </span>
          <span className="hidden sm:inline">The Receipt</span>
        </Link>

        {userId ? (
          <nav className="ml-2 hidden flex-1 items-center gap-1 md:flex lg:ml-4">
            {mainLinks}
          </nav>
        ) : null}

        <div
          className={cn(
            "flex flex-1 items-center justify-end gap-1 sm:gap-2",
            !userId && "flex-1"
          )}
        >
          {userId ? (
            <>
              <NotificationBell userId={userId} />
              <div className="relative hidden md:block" ref={desktopUserRef}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 gap-2 rounded-full px-1.5 pr-2"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                >
                  <Avatar className="h-8 w-8 border border-border/80">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                      {profile ? initials(profile) : "?"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
                {userMenuOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-border/80 bg-popover py-1 shadow-xl">
                    <Link
                      href={profileHref}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/80"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      View profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/80"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-muted/80"
                      onClick={() => void signOut()}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="sm:hidden"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="left-4 right-auto top-20 max-w-[min(100vw-2rem,20rem)] translate-x-0 translate-y-0 border-border/80 bg-card sm:left-6">
          <DialogHeader>
            <DialogTitle className="text-left">Menu</DialogTitle>
          </DialogHeader>
          <nav className="flex flex-col gap-1 py-2">
            {userId ? (
              <>
                <Link
                  href="/feed"
                  className={navClass("/feed")}
                  onClick={() => setMobileOpen(false)}
                >
                  Feed
                </Link>
                <Link
                  href={profileHref}
                  className={navClass(profileHref)}
                  onClick={() => setMobileOpen(false)}
                >
                  My Profile
                </Link>
                <Link
                  href="/notifications"
                  className={navClass("/notifications")}
                  onClick={() => setMobileOpen(false)}
                >
                  Notifications
                </Link>
                <Link
                  href="/premium"
                  className={navClass("/premium")}
                  onClick={() => setMobileOpen(false)}
                >
                  Premium
                </Link>
                <Link
                  href="/listings/new"
                  className={navClass("/listings/new")}
                  onClick={() => setMobileOpen(false)}
                >
                  Post Listing
                </Link>
                <hr className="my-2 border-border/60" />
                <Link
                  href="/settings"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60"
                  onClick={() => setMobileOpen(false)}
                >
                  Settings
                </Link>
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-muted/60"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    Sign up
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </DialogContent>
      </Dialog>
    </header>
  );
}
