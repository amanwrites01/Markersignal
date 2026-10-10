import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleLoginView } from "@/components/auth/role-login-view";
import { safeNext } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Creator Log in" };

export default async function CreatorLoginPage({ searchParams }: PageProps<"/auth/login/creator">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNext(params.next, "") || undefined : undefined;
  const linkError = params.error === "link";

  return (
    <Suspense>
      <RoleLoginView
        initialRole="creator"
        next={next}
        linkError={linkError}
        lockRole={true}
      />
    </Suspense>
  );
}
