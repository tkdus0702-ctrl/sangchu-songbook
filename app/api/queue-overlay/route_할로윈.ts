import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function GET() {
  try {
    const [queueResult, completedResult, requestResult] = await Promise.all([
      supabase
        .from("song_queue")
        .select("id, title, artist, song_key, level, category, difficulty, position, completed")
        .eq("completed", false)
        .order("position", { ascending: true }),
      supabase
        .from("song_queue")
        .select("id", { count: "exact", head: true })
        .eq("completed", true),
      supabase
        .from("song_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    if (queueResult.error) throw queueResult.error;
    if (completedResult.error) throw completedResult.error;
    if (requestResult.error) throw requestResult.error;

    return NextResponse.json(
      {
        success: true,
        queue: queueResult.data ?? [],
        activeCount: queueResult.data?.length ?? 0,
        completedCount: completedResult.count ?? 0,
        pendingRequestCount: requestResult.count ?? 0,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Queue overlay API error:", error);
    return NextResponse.json(
      { success: false, message: "Queue를 불러오지 못했습니다." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
