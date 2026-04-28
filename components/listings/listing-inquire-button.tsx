"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface ListingInquireButtonProps {
  listingTitle: string;
  sellerUsername: string;
}

export function ListingInquireButton({
  listingTitle,
  sellerUsername,
}: ListingInquireButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  function send(): void {
    toast({
      title: "Thanks for reaching out",
      description:
        "In-app messaging isn’t wired yet. Visit their full profile or check back soon — we’ll route inquiries here.",
    });
    setOpen(false);
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-amber-400 font-bold text-primary-foreground shadow-lg shadow-primary/25"
        >
          Contact / inquire
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inquire about this listing</DialogTitle>
          <DialogDescription>
            {listingTitle} — seller @{sellerUsername}. Optional note (not sent
            yet — placeholder until messaging ships).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Introduce yourself or ask a question…"
          className="min-h-[100px]"
          maxLength={500}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={send}>
            Submit (demo)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
