"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { signupSchema, type SignupFormValues } from "@/lib/auth-schemas";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type SignupFormProps = {
  /** Digits or formatted; from ?phone= on invite links */
  initialPhone?: string;
};

export function SignupForm({ initialPhone = "" }: SignupFormProps): React.JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const configured = isSupabaseConfigured();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      phone: initialPhone,
    },
  });

  async function onSubmit(values: SignupFormValues): Promise<void> {
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
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Could not sign up",
          description: error.message,
        });
        return;
      }
      toast({
        title: "Check your inbox",
        description:
          "We sent a confirmation link if email signups are enabled in Supabase.",
      });
      router.push("/login");
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
            Configure Supabase env vars in{" "}
            <code className="text-xs">.env.local</code> before signing up.
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (optional)</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1…"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                If you landed here from a text, your number may already be filled in
                so you can add it to your profile after signup.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
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
          {submitting ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </Form>
  );
}
