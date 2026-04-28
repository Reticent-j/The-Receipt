"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  updateAccountEmail,
  updateAccountPassword,
  updatePrivacyPrefs,
  updateProfileBasics,
  updateSmsNotificationPrefs,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type SettingsPageClientProps = {
  profile: ProfileRow;
};

function ToggleRow(props: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={props.id} className="text-sm font-medium text-foreground">
          {props.label}
        </Label>
        {props.description ? (
          <p className="text-xs text-muted-foreground">{props.description}</p>
        ) : null}
      </div>
      <button
        id={props.id}
        type="button"
        role="switch"
        aria-checked={props.checked}
        disabled={props.disabled}
        onClick={() => props.onChange(!props.checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          props.checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-6 w-6 translate-x-0.5 rounded-full bg-background shadow ring-0 transition-transform",
            props.checked && "translate-x-[1.35rem]"
          )}
        />
      </button>
    </div>
  );
}

export function SettingsPageClient({
  profile,
}: SettingsPageClientProps): React.JSX.Element {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");

  const [smsNewRating, setSmsNewRating] = useState(profile.sms_notify_new_rating);
  const [smsUnlock, setSmsUnlock] = useState(
    profile.sms_notify_rating_unlocked
  );
  const [smsInquiry, setSmsInquiry] = useState(
    profile.sms_notify_listing_inquiry
  );
  const [smsMessage, setSmsMessage] = useState(
    profile.sms_notify_new_message
  );

  const [whoCanRate, setWhoCanRate] = useState<
    "anyone" | "contacts_only"
  >(
    profile.who_can_rate === "contacts_only" ? "contacts_only" : "anyone"
  );
  const [scorePublic, setScorePublic] = useState(profile.score_public);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function saveProfile(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSavingProfile(true);
    const res = await updateProfileBasics({
      full_name: fullName.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });
    setSavingProfile(false);
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: res.error,
      });
      return;
    }
    toast({ title: "Profile updated" });
    router.refresh();
  }

  async function saveSms(): Promise<void> {
    setSavingSms(true);
    const res = await updateSmsNotificationPrefs({
      sms_notify_new_rating: smsNewRating,
      sms_notify_rating_unlocked: smsUnlock,
      sms_notify_listing_inquiry: smsInquiry,
      sms_notify_new_message: smsMessage,
    });
    setSavingSms(false);
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: res.error,
      });
      return;
    }
    toast({ title: "SMS preferences saved" });
    router.refresh();
  }

  async function savePrivacy(): Promise<void> {
    setSavingPrivacy(true);
    const res = await updatePrivacyPrefs({
      who_can_rate: whoCanRate,
      score_public: scorePublic,
    });
    setSavingPrivacy(false);
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: res.error,
      });
      return;
    }
    toast({ title: "Privacy settings saved" });
    router.refresh();
  }

  async function saveEmail(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.trim()) return;
    setSavingEmail(true);
    const res = await updateAccountEmail(email.trim());
    setSavingEmail(false);
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Email update failed",
        description: res.error,
      });
      return;
    }
    setEmail("");
    toast({
      title: "Check your inbox",
      description:
        "If confirmations are enabled, Supabase will email you to verify the new address.",
    });
  }

  async function savePassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSavingPassword(true);
    const res = await updateAccountPassword({ newPassword });
    setSavingPassword(false);
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Password update failed",
        description: res.error,
      });
      return;
    }
    setNewPassword("");
    toast({ title: "Password updated" });
  }

  async function deleteAccount(): Promise<void> {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUsername: deleteConfirm.trim() }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Could not delete account",
          description: body.error ?? res.statusText,
        });
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteConfirm("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tune how you show up — and how hard we nudge you when something
          interesting happens.
        </p>
      </div>

      <Card className="border-border/80 bg-card/50">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Name, bio, and avatar image URL (paste a hosted image link).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void saveProfile(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Display name</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="A line or two about you…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/50">
        <CardHeader>
          <CardTitle>SMS notifications</CardTitle>
          <CardDescription>
            When something is worth interrupting you for — toggle each channel.
            (Delivery uses your profile phone when Twilio is configured.)
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          <ToggleRow
            id="sms_new_rating"
            label="New Receipt started"
            description="Someone left you a rating-in-progress — your move."
            checked={smsNewRating}
            onChange={setSmsNewRating}
          />
          <ToggleRow
            id="sms_unlock"
            label="Receipt unlocked"
            description="Both sides submitted — the reveal you’ve been waiting for."
            checked={smsUnlock}
            onChange={setSmsUnlock}
          />
          <ToggleRow
            id="sms_inquiry"
            label="Listing inquiry"
            description="Someone’s circling your listing."
            checked={smsInquiry}
            onChange={setSmsInquiry}
          />
          <ToggleRow
            id="sms_message"
            label="New message"
            description="When DMs ship, we’ll text you here first."
            checked={smsMessage}
            onChange={setSmsMessage}
          />
          <div className="pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={savingSms}
              onClick={() => void saveSms()}
            >
              {savingSms ? "Saving…" : "Save SMS preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/50">
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Who can start a Receipt with you, and whether your score is public.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="who_can_rate">Who can rate you</Label>
            <select
              id="who_can_rate"
              value={whoCanRate}
              onChange={(e) =>
                setWhoCanRate(e.target.value as "anyone" | "contacts_only")
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="anyone">Anyone signed in</option>
              <option value="contacts_only">
                Only people in my contacts who&apos;ve matched me
              </option>
            </select>
          </div>
          <ToggleRow
            id="score_public"
            label="Public Receipt score"
            description="When off, visitors see a private score teaser instead of your number."
            checked={scorePublic}
            onChange={setScorePublic}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={savingPrivacy}
            onClick={() => void savePrivacy()}
          >
            {savingPrivacy ? "Saving…" : "Save privacy"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/50">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Email, password, and the nuclear option.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <form onSubmit={(e) => void saveEmail(e)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new_email">Change email</Label>
              <Input
                id="new_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="new@email.com"
              />
            </div>
            <Button type="submit" variant="outline" disabled={savingEmail}>
              {savingEmail ? "Updating…" : "Update email"}
            </Button>
          </form>

          <form onSubmit={(e) => void savePassword(e)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <Button type="submit" variant="outline" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </form>

          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              Delete account
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Permanently removes your auth user and cascaded data. Requires{" "}
              <code className="text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code> on
              the server.
            </p>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="mt-3"
                  size="sm"
                >
                  Delete my account…
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete account</DialogTitle>
                  <DialogDescription>
                    Type your username{" "}
                    <span className="font-mono font-semibold text-foreground">
                      @{profile.username}
                    </span>{" "}
                    to confirm. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={profile.username}
                  autoComplete="off"
                />
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={
                      deleting ||
                      deleteConfirm.trim() !== profile.username
                    }
                    onClick={() => void deleteAccount()}
                  >
                    {deleting ? "Deleting…" : "Delete forever"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
