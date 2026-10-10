import type { Metadata } from "next";
import { Mail, ShieldAlert } from "lucide-react";
import { TemplateNotice } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Contact" };

// Replace these with the platform owner's real addresses before launch.
const CONTACTS = [
  { icon: Mail, label: "General & support", email: "hello@makersignal.example", body: "Questions about your account, campaigns or projects." },
  { icon: ShieldAlert, label: "Trust, safety & rights", email: "trust@makersignal.example", body: "Reports, takedown requests, and privacy or data requests." },
];

export default function ContactPage() {
  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Talk to the MAKERSIGNAL team</h1>
      <p className="mt-3 text-ink-muted">Signed in? The fastest way to flag a problem with a profile, campaign or message is the Report button next to it.</p>
      <div className="mt-8">
        <TemplateNotice />
        <p className="mt-2 text-xs text-ink-muted">The addresses below are placeholders (.example domains never receive mail) and must be replaced by the platform owner.</p>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {CONTACTS.map((c) => (
          <li key={c.label} className="rounded-2xl border border-line bg-white p-6">
            <c.icon className="size-5 text-forest" aria-hidden />
            <p className="mt-4 font-semibold">{c.label}</p>
            <p className="mt-1 text-sm text-ink-muted">{c.body}</p>
            <a href={`mailto:${c.email}`} className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
              {c.email}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
