import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// OBS 오버레이용 공개 데이터 API입니다. 요청자 정보나 요청 곡 상세정보는 노출하지 않고
// Queue 목록과 승인 대기 요청 개수만 반환합니다.
export async function GET() {
  const [queueResult, completedResult, requestsResult] = await Promise.all([
    supabaseAdmin
      .from("song_queue")
      .select("id, song_id, title, artist, song_key, level, category, difficulty, position, completed")
      .eq("completed", false)
      .order("position", { ascending: true }),
    supabaseAdmin
      .from("song_queue")
      .select("id", { count: "exact", head: true })
      .eq("completed", true),
    supabaseAdmin
      .from("song_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const error = queueResult.error || completedResult.error || requestsResult.error;
  if (error) {
    console.error("Queue 오버레이 조회 오류:", error);
    return NextResponse.json(
      { success: false, message: "오버레이 정보를 불러오지 못했습니다." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      queue: queueResult.data ?? [],
      activeCount: queueResult.data?.length ?? 0,
      completedCount: completedResult.count ?? 0,
      pendingRequestCount: requestsResult.count ?? 0,
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
