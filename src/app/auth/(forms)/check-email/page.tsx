import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, MailCheck } from "lucide-react";
import { VerifyCodeForm } from "@/components/auth/verify-code-form";
import { readDevCode } from "@/lib/dev-email";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: PageProps<"/auth/check-email">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.toLowerCase() : undefined;
  const reset = params.mode === "reset";
  const dev = await readDevCode(email);
  const kind = dev?.kind ?? (reset ? "recovery" : "signup");

  return (
    <div>
      <span className="mb-6 grid size-14 place-items-center rounded-full bg-lime-soft text-forest">
        <MailCheck className="size-6" aria-hidden />
      </span>
      <h1 className="h-page">{reset ? "Reset your password" : "Confirm your email"}</h1>
      <p className="mt-3 text-ink-muted">
        {dev ? (
          <>A verification code was created for <strong className="text-forest">{email}</strong>. Enter it below to continue.</>
        ) : (
          <>
            {reset ? "If an account exists for " : "We sent a verification code and a link to "}
            {email ? <strong className="text-forest">{email}</strong> : "your email"}
            {reset ? ", we sent a reset code." : ". Enter the code below or open the link on this device."}
          </>
        )}
      </p>

      {dev ? (
        <div role="status" className="mt-6 rounded-2xl border border-warning/25 bg-warning-soft p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-warning">
            <FlaskConical className="size-4" aria-hidden /> Temporary: email sending isn&apos;t set up yet
          </p>
          <p className="mt-1 text-sm text-forest/80">Until email delivery is configured, your code is shown here instead of being emailed.</p>
          <p className="mt-3 font-mono text-3xl font-semibold tracking-[0.4em]" aria-label={`Your code is ${dev.code.split("").join(" ")}`}>
            {dev.code}
          </p>
        </div>
      ) : null}

      {email ? (
        <div className="mt-6">
          <VerifyCodeForm email={email} kind={kind} defaultCode={dev?.code ?? ""} />
        </div>
      ) : null}

      <p className="mt-8 text-sm text-ink-muted">
        Wrong email or no code?{" "}
        <Link href={reset ? "/auth/forgot-password" : "/auth/sign-up"} className="font-medium text-forest underline underline-offset-4">
          Start again
        </Link>{" "}
        or{" "}
        <Link href="/auth/login" className="font-medium text-forest underline underline-offset-4">
          log in
        </Link>
        .
      </p>
    </div>
  );
}
