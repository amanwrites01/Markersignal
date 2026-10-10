import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { getViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <>
        <h1 className="h-page">Link expired</h1>
        <p className="mt-2 mb-6 text-ink-muted">Password reset links work once and expire after a short time.</p>
        <Link href="/auth/forgot-password" className="font-medium underline underline-offset-4">
          Request a new link
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="h-page">Choose a new password</h1>
      <p className="mt-2 mb-8 text-ink-muted">For {viewer.email}</p>
      <ResetPasswordForm />
    </>
  );
}
