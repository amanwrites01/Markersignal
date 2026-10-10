import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProjectRights } from "@/lib/data/rights";

/** JSON export of rights records — project members only (RLS + explicit membership check). */
export async function GET(request: NextRequest, ctx: RouteContext<"/projects/[id]/rights/export/json">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const rights = await getProjectRights(id, user.id);
  if (!rights) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const recordId = request.nextUrl.searchParams.get("record");
  const records = rights.records.filter((r) => !recordId || r.id === recordId);
  const body = {
    notice:
      "Record of usage terms approved through MAKERSIGNAL. Not automatically a legally binding contract; enforceability depends on the parties' agreement and applicable law.",
    exported_at: new Date().toISOString(),
    project: { id: rights.project.id, title: rights.project.title, status: rights.project.status },
    parties: { creator: rights.creatorName, brand: rights.brandName },
    records: records.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.effective_status,
      revision: r.revision,
      deliverable_id: r.deliverable_id,
      content_type: r.content_type,
      platforms: r.platformNames,
      organic_use: r.organic_use,
      paid_ads_use: r.paid_ads_use,
      paid_ads_notes: r.paid_ads_notes,
      territory: r.territory,
      license_start: r.license_start,
      license_end: r.license_end,
      duration_months: r.duration_months,
      exclusivity: r.exclusivity,
      exclusivity_details: r.exclusivity_details,
      raw_files_included: r.raw_files_included,
      raw_files_notes: r.raw_files_notes,
      derivative_edits_allowed: r.derivative_edits_allowed,
      derivative_notes: r.derivative_notes,
      ai_training_allowed: r.ai_training_allowed,
      attribution_required: r.attribution_required,
      attribution_details: r.attribution_details,
      additional_terms: r.additional_terms,
      brand_approved_at: r.brand_approved_at,
      creator_approved_at: r.creator_approved_at,
      dispute_reason: r.dispute_reason,
      updated_at: r.updated_at,
    })),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rights-passport-${id}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
