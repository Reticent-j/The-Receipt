import type { ReactNode } from "react";

import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";

export type NavProfile = {
  username: string;
  avatar_url: string | null;
  full_name: string | null;
} | null;

export async function AppChrome({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: NavProfile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, full_name")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userId={user?.id ?? null} profile={profile} />
      {children}
    </div>
  );
}
