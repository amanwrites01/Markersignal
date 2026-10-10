"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { submitReport } from "@/server/reports";

const REASONS = [
  ["spam", "Spam"],
  ["misleading", "Misleading or false information"],
  ["inappropriate", "Inappropriate content"],
  ["harassment", "Harassment"],
  ["ip_violation", "Uses work without permission"],
  ["fraud", "Fraud or scam"],
  ["other", "Something else"],
] as const;

export function ReportButton({ entityType, entityId, label = "Report" }: { entityType: string; entityId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-ink-muted">
          <Flag aria-hidden /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this</DialogTitle>
          <DialogDescription>Reports are private and reviewed by the MAKERSIGNAL team.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Reason" htmlFor="report-reason">
            <NativeSelect value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Details" htmlFor="report-details" optional>
            <Textarea rows={4} maxLength={3000} placeholder="What happened? Links or examples help." value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await submitReport({ entityType, entityId, reason, details });
                if (r.ok) {
                  toast.success(r.message);
                  setOpen(false);
                } else toast.error(r.error);
              })
            }
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
