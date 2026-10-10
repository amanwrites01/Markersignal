import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleLoginView } from "@/components/auth/role-login-view";
import { safeNext } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/auth/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNext(params.next, "") || undefined : undefined;
  const linkError = params.error === "link";
  const initialRole = params.role === "brand" ? "brand" : "creator";

  return (
    <Suspense>
      <RoleLoginView
        initialRole={initialRole}
        next={next}
        linkError={linkError}
      />
    </Suspense>
  );
}
