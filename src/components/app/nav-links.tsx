"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Bookmark, Calculator, Sparkles, Compass, FolderKanban, Images, Inbox, LayoutDashboard, Megaphone, MessagesSquare, Search, Send, Settings, UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard, compass: Compass, send: Send, "folder-kanban": FolderKanban,
  "messages-square": MessagesSquare, images: Images, "user-round": UserRound, bookmark: Bookmark,
  megaphone: Megaphone, search: Search, inbox: Inbox, bell: Bell, settings: Settings, calculator: Calculator, sparkles: Sparkles,
};

export function NavLinks({ items, counts, onNavigate }: { items: NavItem[]; counts: Record<string, number>; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="grid gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
        // The most specific matching item wins (e.g. Brief simulator over Campaigns).
        const active = matches(item.href) && !items.some((o) => o.href.length > item.href.length && o.href.startsWith(item.href) && matches(o.href));
        const count = item.badge ? counts[item.badge] ?? 0 : 0;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active ? "bg-deep font-medium text-ivory" : "text-ivory/70 hover:bg-deep/60 hover:text-ivory",
              )}
            >
              <Icon className={cn("size-[18px]", active ? "text-lime" : "")} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {count > 0 ? (
                <span className="rounded-full bg-lime px-1.5 py-0.5 text-[11px] leading-none font-semibold text-forest">
                  {count > 99 ? "99+" : count}
                  <span className="sr-only"> unread</span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
