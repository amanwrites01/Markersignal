"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { NavLinks } from "./nav-links";
import type { NavItem } from "./nav-config";

export function MobileNav({ items, counts, home }: { items: NavItem[]; counts: Record<string, number>; home: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="on-dark w-[82vw] max-w-xs border-none bg-forest p-4 text-ivory">
        <SheetHeader className="p-2">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo dark href={home} />
        </SheetHeader>
        <nav aria-label="Workspace" className="mt-4">
          <NavLinks items={items} counts={counts} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
