import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000).toISOString();

    // Total documents
    const { count: totalDocuments } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId);

    // Total storage used
    const { data: storageData } = await supabase
      .from("documents")
      .select("file_size_bytes")
      .eq("created_by", userId);

    const totalStorageBytes = (storageData ?? []).reduce(
      (sum, d) => sum + (d.file_size_bytes ?? 0),
      0
    );

    // Event counts by type (last 30 days)
    const { data: eventCounts } = await supabase
      .from("document_analytics")
      .select("event_type")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo);

    const countByType: Record<string, number> = { view: 0, download: 0, export: 0, preview: 0 };
    for (const e of eventCounts ?? []) {
      countByType[e.event_type] = (countByType[e.event_type] ?? 0) + 1;
    }

    // Top 5 most viewed documents (last 30 days)
    const { data: topViewsRaw } = await supabase
      .from("document_analytics")
      .select("document_id")
      .eq("user_id", userId)
      .eq("event_type", "view")
      .gte("created_at", thirtyDaysAgo);

    const viewsByDoc: Record<string, number> = {};
    for (const e of topViewsRaw ?? []) {
      viewsByDoc[e.document_id] = (viewsByDoc[e.document_id] ?? 0) + 1;
    }
    const topDocIds = Object.entries(viewsByDoc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    let topDocuments: Array<{ id: string; title: string; views: number }> = [];
    if (topDocIds.length > 0) {
      const { data: topDocs } = await supabase
        .from("documents")
        .select("id,title")
        .in("id", topDocIds);
      topDocuments = (topDocs ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        views: viewsByDoc[d.id] ?? 0,
      })).sort((a, b) => b.views - a.views);
    }

    // Daily event counts for last 14 days
    const { data: dailyEvents } = await supabase
      .from("document_analytics")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", fourteenDaysAgo);

    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyCounts[key] = 0;
    }
    for (const e of dailyEvents ?? []) {
      const key = e.created_at.split("T")[0];
      if (key in dailyCounts) dailyCounts[key]++;
    }
    const dailyActivity = Object.entries(dailyCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    // Documents added per week for last 8 weeks
    const { data: weeklyDocsRaw } = await supabase
      .from("documents")
      .select("created_at")
      .eq("created_by", userId)
      .gte("created_at", eightWeeksAgo);

    // Initialize 8 weekly buckets; bucket[i] covers docs from (i*7+1) to (i+1)*7 days ago.
    // bucket[0] = docs from the past 7 days (current week), bucket[7] = 49-56 days ago.
    const weeklyCounts: Record<string, number> = {};
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const key = weekStart.toISOString().split("T")[0];
      weeklyCounts[key] = 0;
    }
    for (const d of weeklyDocsRaw ?? []) {
      const date = new Date(d.created_at);
      // diff=0 → past 7 days → maps to bucket at now-(0+1)*7d
      const diff = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (diff < 8) {
        const weekStart = new Date(now.getTime() - (diff + 1) * 7 * 24 * 60 * 60 * 1000);
        const key = weekStart.toISOString().split("T")[0];
        if (key in weeklyCounts) weeklyCounts[key]++;
      }
    }
    const weeklyDocuments = Object.entries(weeklyCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekStart, count]) => ({ weekStart, count }));

    return NextResponse.json({
      totalDocuments: totalDocuments ?? 0,
      totalStorageBytes,
      eventCounts: countByType,
      topDocuments,
      dailyActivity,
      weeklyDocuments,
    });
  } catch (err) {
    console.error("Analytics GET error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
