"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { rightsSchema } from "@/lib/validation/rights";
import { reasonSchema, uuid } from "@/lib/validation/project";

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}/rights`);
  revalidatePath(`/creator/projects/${projectId}`);
  revalidatePath(`/brand/projects/${projectId}`);
}

/** Save a draft (submit=false) or submit for the other party's approval (submit=true). */
export async function saveRights(projectId: string, recordId: string | null, input: unknown, submit: boolean): Promise<ActionResult<{ id: string }>> {
  await requireViewer();
  if (!uuid.safeParse(projectId).success || (recordId && !uuid.safeParse(recordId).success)) return fail("Not found.");
  const parsed = rightsSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_rights_record", {
    p_project_id: projectId,
    p_record_id: (recordId ?? null) as string,
    p_submit: submit,
    p_platform_ids: v.platformIds,
    p_terms: {
      title: v.title,
      deliverable_id: v.deliverableId ?? null, // must be JSON null, not "": the SQL casts non-null values to uuid
      content_type: v.contentType ?? "",
      organic_use: v.organicUse,
      paid_ads_use: v.paidAdsUse,
      paid_ads_notes: v.paidAdsNotes ?? "",
      territory: v.territory,
      license_start: v.licenseStart ?? "",
      license_end: v.licenseEnd ?? "",
      duration_months: v.durationMonths != null ? String(v.durationMonths) : "",
      exclusivity: v.exclusivity,
      exclusivity_details: v.exclusivityDetails ?? "",
      raw_files_included: v.rawFilesIncluded,
      raw_files_notes: v.rawFilesNotes ?? "",
      derivative_edits_allowed: v.derivativeEditsAllowed,
      derivative_notes: v.derivativeNotes ?? "",
      ai_training_allowed: v.aiTrainingAllowed,
      attribution_required: v.attributionRequired,
      attribution_details: v.attributionDetails ?? "",
      additional_terms: v.additionalTerms ?? "",
    },
  });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok({ id: data as string }, submit ? "Submitted — the other party has been asked to approve." : "Draft saved");
}

export async function approveRights(projectId: string, recordId: string, revision: number): Promise<ActionResult> {
  await requireViewer();
  if (!uuid.safeParse(projectId).success || !uuid.safeParse(recordId).success || !z.number().int().positive().safeParse(revision).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_rights_record", { p_record_id: recordId, p_revision: revision });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, "Terms agreed by both parties");
}

export async function disputeRights(projectId: string, recordId: string, input: unknown): Promise<ActionResult> {
  await requireViewer();
  if (!uuid.safeParse(projectId).success || !uuid.safeParse(recordId).success) return fail("Not found.");
  const parsed = reasonSchema.safeParse(input);
  if (!parsed.success) return fail("Describe the issue.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.rpc("dispute_rights_record", { p_record_id: recordId, p_reason: parsed.data.reason });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, "Dispute recorded. Edit and resubmit the terms to resolve it.");
}
