"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { fail, ok, type ActionResult } from "@/lib/errors";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  safeNext,
  signUpSchema,
} from "@/lib/validation/auth";
import { homeFor, type Role } from "@/lib/auth/session";
import { limitByIp } from "./rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearDevCode, devEmailCodesEnabled, stashDevCode, type CodeKind } from "@/lib/dev-email";
import { z } from "zod";

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  if (!(await limitByIp("signup", 5, 600))) return fail(TOO_MANY);

  if (devEmailCodesEnabled()) {
    // Temporary: no email is sent; the code is shown on the next screen.
    const { data, error } = await createAdminClient().auth.admin.generateLink({
      type: "signup",
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.fullName } },
    });
    if (error) {
      if (error.code === "email_exists" || error.code === "user_already_exists") {
        return fail("An account with this email already exists. Log in instead.", { email: ["Already registered"] });
      }
      if (error.code === "weak_password") return fail("Choose a stronger password.", { password: [error.message] });
      console.error("[auth] dev signUp", error.code);
      return fail("We couldn't create your account. Please try again.");
    }
    await stashDevCode({ email: parsed.data.email, kind: "signup", code: data.properties.email_otp });
    redirect(`/auth/check-email?email=${encodeURIComponent(parsed.data.email)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return fail("Choose a stronger password.", { password: [error.message] });
    if (error.code === "over_email_send_rate_limit") return fail(TOO_MANY);
    console.error("[auth] signUp", error.code);
    return fail("We couldn't create your account. Please try again.");
  }
  // When confirmations are on, there's no session until the email link is used.
  if (data.session) redirect("/onboarding");
  redirect(`/auth/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  if (!(await limitByIp("login", 10, 300))) return fail(TOO_MANY);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("Please confirm your email first. We can resend the link.", { email: ["unconfirmed"] });
    }
    // Same message for unknown email and wrong password (no account enumeration).
    return fail("Email or password is incorrect.");
  }
  const { data: profile } = await supabase.from("profiles").select("role, onboarding_completed_at").eq("id", data.user.id).single();
  const userRole = (profile?.role ?? null) as Role | null;
  const expectedRole = parsed.data.role;

  // Enforce separate login form roles
  if (expectedRole && userRole && userRole !== expectedRole && userRole !== "admin") {
    // Revoke the session immediately so the user isn't logged into the wrong role workspace
    await supabase.auth.signOut();

    if (expectedRole === "creator" && userRole === "brand") {
      return fail("This account is registered as a Brand. Please use the Brand login form.", {
        role: ["brand_account_detected"],
        email: ["Brand account detected. Please use Brand Login."],
      });
    }

    if (expectedRole === "brand" && userRole === "creator") {
      return fail("This account is registered as a Creator. Please use the Creator login form.", {
        role: ["creator_account_detected"],
        email: ["Creator account detected. Please use Creator Login."],
      });
    }

    return fail(`This account is registered as a ${userRole}. Please use the correct login form.`);
  }

  const role = userRole;
  const destination = !role || !profile?.onboarding_completed_at ? "/onboarding" : homeFor(role);
  redirect(safeNext(parsed.data.next, destination));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Enter a valid email.", parsed.error.flatten().fieldErrors);
  if (!(await limitByIp("reset", 5, 900))) return fail(TOO_MANY);
  if (devEmailCodesEnabled()) {
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email: parsed.data.email });
    if (error) {
      if (error.code === "user_not_found") {
        return fail("No account found with this email. Please check your email address or sign up first.", {
          email: ["No account found for this email address"],
        });
      }
      console.error("[auth] dev reset error", error.code);
      return fail("Could not generate a reset code. Please try again.");
    }
    await stashDevCode({ email: parsed.data.email, kind: "recovery", code: data.properties.email_otp });
    redirect(`/auth/check-email?email=${encodeURIComponent(parsed.data.email)}&mode=reset`);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/auth/reset-password`,
  });
  if (error && error.code !== "user_not_found") console.error("[auth] reset", error.code);
  // Always the same response, whether or not the account exists.
  return ok(undefined, "If an account exists for that email, a reset link is on its way.");
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your reset link has expired. Request a new one.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return fail("Choose a password you haven't used here before.", { password: [error.message] });
    if (error.code === "weak_password") return fail("Choose a stronger password.", { password: [error.message] });
    console.error("[auth] updatePassword", error.code);
    return fail("We couldn't update your password. Request a new link and try again.");
  }
  return ok(undefined, "Password updated.");
}

export async function resendConfirmation(email: string): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return fail("Enter a valid email.");
  if (!(await limitByIp("resend", 3, 900))) return fail(TOO_MANY);
  if (devEmailCodesEnabled()) {
    // A magic-link code confirms the email when used.
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email: parsed.data.email });
    if (!error) await stashDevCode({ email: parsed.data.email, kind: "magiclink", code: data.properties.email_otp });
    redirect(`/auth/check-email?email=${encodeURIComponent(parsed.data.email)}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/onboarding` },
  });
  if (error && error.code !== "user_not_found") console.error("[auth] resend", error.code);
  return ok(undefined, "If that account still needs confirming, we've sent a new link.");
}

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z
    .string()
    .trim()
    .transform((s) => s.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{6,8}$/, "Enter the verification code")),
  kind: z.enum(["signup", "magiclink", "recovery"]),
});

/** Verifies an emailed (or, in temporary dev mode, on-screen) verification code and signs the user in. */
export async function verifyEmailCode(input: unknown): Promise<ActionResult> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return fail("Enter the verification code.", parsed.error.flatten().fieldErrors);
  if (!(await limitByIp("verify", 10, 600))) return fail(TOO_MANY);
  const supabase = await createClient();
  const kind: CodeKind = parsed.data.kind;
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: kind === "magiclink" ? "email" : kind,
  });
  if (error) return fail("That code is invalid or has expired. Request a new one.", { code: ["Invalid or expired code"] });
  await clearDevCode();
  redirect(kind === "recovery" ? "/auth/reset-password" : "/onboarding");
}
