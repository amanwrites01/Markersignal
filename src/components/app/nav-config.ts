export type NavItem = { href: string; label: string; icon: string; badge?: "messages" | "notifications" };

export const CREATOR_NAV: NavItem[] = [
  { href: "/creator/dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/creator/opportunities", label: "Opportunities", icon: "compass" },
  { href: "/creator/proposals", label: "Proposals", icon: "send" },
  { href: "/creator/projects", label: "Projects", icon: "folder-kanban" },
  { href: "/creator/messages", label: "Messages", icon: "messages-square", badge: "messages" },
  { href: "/creator/portfolio", label: "Portfolio", icon: "images" },
  { href: "/creator/profile", label: "Profile & DNA", icon: "user-round" },
  { href: "/creator/saved", label: "Saved", icon: "bookmark" },
  { href: "/tools/scope-to-price", label: "Scope-to-Price", icon: "calculator" },
];

export const BRAND_NAV: NavItem[] = [
  { href: "/brand/dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/brand/campaigns", label: "Campaigns", icon: "megaphone" },
  { href: "/brand/creators", label: "Find creators", icon: "search" },
  { href: "/brand/shortlist", label: "Shortlist", icon: "bookmark" },
  { href: "/brand/proposals", label: "Proposals", icon: "inbox" },
  { href: "/brand/projects", label: "Projects", icon: "folder-kanban" },
  { href: "/brand/messages", label: "Messages", icon: "messages-square", badge: "messages" },
  { href: "/brand/campaigns/simulator", label: "Brief simulator", icon: "sparkles" },
  { href: "/tools/scope-to-price", label: "Scope-to-Price", icon: "calculator" },
];
