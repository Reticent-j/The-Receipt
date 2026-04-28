"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { loginSchema, type LoginFormValues } from "@/lib/auth-schemas";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const configured = isSupabaseConfigured();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    if (!configured) {
      toast({
        variant: "destructive",
        title: "Supabase not configured",
        description:
          "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Could not sign in",
          description: error.message,
        });
        return;
      }
      toast({ title: "Signed in", description: "Welcome back." });
      const dest = safeNextPath(searchParams.get("next"));
      router.push(dest);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!configured ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            in <code className="text-xs">.env.local</code> to enable auth.
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !configured}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </form>
    </Form>
  );
}
