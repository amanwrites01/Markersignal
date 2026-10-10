import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The brand's campaigns that can currently send invitations. */
export async function getInvitableCampaigns(brandId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, title")
    .eq("brand_id", brandId)
    .in("status", ["published", "paused"])
    .order("created_at", { ascending: false });
  return data ?? [];
}
