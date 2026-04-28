"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createListing } from "@/app/actions/listings";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { FREE_TIER_ACTIVE_LISTING_LIMIT } from "@/lib/subscription";
import { LISTING_CATEGORY_LABEL } from "@/lib/profile-display";
import { createClient } from "@/lib/supabase/client";
import type { Database, ListingCategory } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];

const CATEGORIES: ListingCategory[] = [
  "roommate",
  "selling",
  "gig",
  "dating",
  "other",
];

interface CreateListingFormProps {
  poster: ProfileRow;
  atListingLimit?: boolean;
  activeListingCount?: number;
}

export function CreateListingForm({
  poster,
  atListingLimit = false,
  activeListingCount = 0,
}: CreateListingFormProps): React.JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ListingCategory>("selling");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const previewImageUrls = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );

  useEffect(() => {
    return () => {
      previewImageUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewImageUrls]);

  const previewListing: ListingRow = useMemo(() => {
    let priceNum: number | null = null;
    if (price.trim()) {
      const n = Number.parseFloat(price);
      priceNum = Number.isFinite(n) && n >= 0 ? n : null;
    }
    return {
      id: "00000000-0000-0000-0000-000000000001",
      user_id: poster.id,
      title: title.trim() || "Your title",
      description: description.trim() || null,
      category,
      price: priceNum,
      location: location.trim() || null,
      status: "active",
      images: [],
      boost_expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [title, description, category, price, location, poster.id]);

  const previewPoster = useMemo(
    () => ({
      id: poster.id,
      username: poster.username,
      full_name: poster.full_name,
      avatar_url: poster.avatar_url,
      overall_score: poster.overall_score,
      total_ratings: poster.total_ratings,
      subscription_status: poster.subscription_status ?? "free",
    }),
    [poster]
  );

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const list = Array.from(e.target.files ?? []).slice(0, 4);
    setFiles(list);
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Give your listing a clear title.",
      });
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Sign in required",
          description: "Log in to post a listing.",
        });
        setUploading(false);
        return;
      }

      const urls: string[] = [];
      for (const file of files) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });
        if (upErr) {
          toast({
            variant: "destructive",
            title: "Image upload failed",
            description: upErr.message,
          });
          setUploading(false);
          return;
        }
        const { data: pub } = supabase.storage
          .from("listing-images")
          .getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      const res = await createListing({
        title: title.trim(),
        description: description.trim() || null,
        category,
        price: price.trim() ? Number.parseFloat(price) : null,
        location: location.trim() || null,
        images: urls,
      });

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Could not post",
          description: res.error,
        });
        setUploading(false);
        return;
      }

      toast({ title: "Listing published", description: "It’s live on the feed." });
      router.push(`/listings/${res.listingId}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-8 lg:grid-cols-2 lg:items-start">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-6 rounded-3xl border border-border/80 bg-card/40 p-6 shadow-xl sm:p-8"
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            New listing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Receipt score will show on the card — same as everywhere on The
            Receipt.
          </p>
          {atListingLimit ? (
            <div className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
              <p className="font-semibold text-foreground">
                You&apos;re at the free limit ({activeListingCount}/
                {FREE_TIER_ACTIVE_LISTING_LIMIT} active listings)
              </p>
              <p className="mt-1 text-muted-foreground">
                Close an old listing or upgrade to{" "}
                <Link href="/premium" className="font-medium text-primary underline">
                  Receipt Premium
                </Link>{" "}
                for unlimited posts.
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Room in 2BR, available June"
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ListingCategory)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {LISTING_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you offering? Any requirements?"
            className="min-h-[140px] resize-y"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price">Price (optional)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="USD"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or neighborhood"
              maxLength={200}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="images">Photos (up to 4)</Label>
          <Input
            id="images"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={onFilesChange}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Stored in Supabase bucket <code className="text-primary">listing-images</code>{" "}
            under your user id. Run the storage migration if uploads fail.
          </p>
          {files.length > 0 ? (
            <ul className="text-xs text-muted-foreground">
              {files.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            disabled={uploading || atListingLimit}
            className="bg-gradient-to-r from-primary to-amber-400 font-bold text-primary-foreground shadow-lg shadow-primary/25"
          >
            {uploading
              ? "Publishing…"
              : atListingLimit
                ? "Listing limit reached"
                : "Publish listing"}
          </Button>
        </div>
      </form>

      <div className="space-y-4 lg:sticky lg:top-28">
        <h2 className="text-lg font-bold text-foreground">Live card preview</h2>
        <p className="text-sm text-muted-foreground">
          This is how your listing appears in the marketplace — Receipt score is
          always visible.
        </p>
        <ListingCard
          listing={{
            ...previewListing,
            images: previewImageUrls,
          }}
          poster={previewPoster}
        />
      </div>
    </div>
  );
}
