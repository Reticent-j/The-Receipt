"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function HowItWorksDialog(): React.JSX.Element {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="border-primary/40">
          How ratings stay fair
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Double-blind, mutual, real people</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ratings only count when both sides have actually interacted. Neither
            party sees the other&apos;s score until both submit—then the
            exchange becomes part of a public reputation layer you can take to
            any deal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Example private note (not stored in this demo)
          </p>
          <Textarea
            readOnly
            placeholder="What stood out about working with them?"
            className="min-h-[100px] resize-none border-dashed bg-muted/30"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
