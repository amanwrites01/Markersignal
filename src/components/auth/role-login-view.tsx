"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { FormError } from "@/components/form/field";

interface RoleLoginViewProps {
  initialRole?: "creator" | "brand";
  next?: string;
  linkError?: boolean;
  lockRole?: boolean; // When true (on /auth/login/creator or /auth/login/brand), show dedicated role styling but allow switching
}

export function RoleLoginView({
  initialRole = "creator",
  next,
  linkError,
  lockRole = false,
}: RoleLoginViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeRole, setActiveRole] = useState<"creator" | "brand">(initialRole);
  const [email, setEmail] = useState<string>(searchParams?.get("email") || "");

  const handleRoleSwitch = (newRole: "creator" | "brand", newEmail?: string) => {
    setActiveRole(newRole);
    if (newEmail !== undefined) setEmail(newEmail);
    if (lockRole) {
      const q = new URLSearchParams();
      if (newEmail) q.set("email", newEmail);
      if (next) q.set("next", next);
      const query = q.toString() ? `?${q.toString()}` : "";
      router.push(`/auth/login/${newRole}${query}`);
    } else {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("role", newRole);
      if (newEmail) params.set("email", newEmail);
      router.replace(`/auth/login?${params.toString()}`);
    }
  };

  const isCreator = activeRole === "creator";

  return (
    <div>
      {/* Role Toggle Selector */}
      <div className="mb-6 flex rounded-xl bg-forest/5 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => handleRoleSwitch("creator")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 transition-all cursor-pointer",
            isCreator
              ? "bg-white text-forest shadow-sm ring-1 ring-black/5 font-semibold"
              : "text-ink-muted hover:text-forest",
          )}
        >
          <Clapperboard className="size-4" />
          <span>Creator</span>
        </button>
        <button
          type="button"
          onClick={() => handleRoleSwitch("brand")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 transition-all cursor-pointer",
            !isCreator
              ? "bg-white text-forest shadow-sm ring-1 ring-black/5 font-semibold"
              : "text-ink-muted hover:text-forest",
          )}
        >
          <Building2 className="size-4" />
          <span>Brand</span>
        </button>
      </div>

      {/* Role Header Banner */}
      <div className="mb-6">
        <div className="mb-2">
          {isCreator ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/15 bg-lime-soft px-3 py-0.5 text-xs font-semibold text-forest">
              <Clapperboard className="size-3.5" /> Creator Portal
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/15 bg-forest/10 px-3 py-0.5 text-xs font-semibold text-forest">
              <Building2 className="size-3.5" /> Brand Portal
            </span>
          )}
        </div>
        <h1 className="h-page text-2xl sm:text-3xl font-bold tracking-tight text-forest">
          {isCreator ? "Creator Log in" : "Brand Log in"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isCreator
            ? "Log in to view briefs, submit proposals, and manage your portfolio."
            : "Log in to launch campaigns, discover creators, and manage projects."}
        </p>
      </div>

      {linkError ? (
        <div className="mb-4">
          <FormError message="That link is invalid or has expired. Log in, or request a new link." />
        </div>
      ) : null}

      <GoogleButton next={next || (isCreator ? "/creator/dashboard" : "/brand/dashboard")} />
      <OrDivider />

      <LoginForm
        key={`${activeRole}-${email}`}
        role={activeRole}
        next={next}
        defaultEmail={email}
        onSwitchRole={handleRoleSwitch}
      />

      <p className="mt-6 text-center text-sm text-ink-muted">
        New to MAKERSIGNAL?{" "}
        <Link href="/auth/sign-up" className="font-medium text-forest underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
