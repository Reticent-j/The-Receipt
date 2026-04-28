import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
    /** From invite links (?phone=); optional, not sent to Supabase Auth today. */
    phone: z.string().max(32).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
