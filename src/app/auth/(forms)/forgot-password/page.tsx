import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="h-page">Reset your password</h1>
      <p className="mt-2 mb-8 text-ink-muted">Enter your account email and we&apos;ll send you a secure link.</p>
      <ForgotPasswordForm />
    </>
  );
}
