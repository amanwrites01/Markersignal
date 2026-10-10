import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="h-page">Create your account</h1>
      <p className="mt-2 mb-8 text-ink-muted">You&apos;ll choose whether you&apos;re a creator or a brand next.</p>
      <GoogleButton />
      <OrDivider />
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-forest underline underline-offset-4">
          Log in
        </Link>
      </p>
    </>
  );
}
