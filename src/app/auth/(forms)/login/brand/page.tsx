import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleLoginView } from "@/components/auth/role-login-view";
import { safeNext } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Brand Log in" };

export default async function BrandLoginPage({ searchParams }: PageProps<"/auth/login/brand">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNext(params.next, "") || undefined : undefined;
  const linkError = params.error === "link";

  return (
    <Suspense>
      <RoleLoginView
        initialRole="brand"
        next={next}
        linkError={linkError}
        lockRole={true}
      />
    </Suspense>
  );
}
