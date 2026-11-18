
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOOP_ID = "hiyam2411";

const SOOP_API =
  `https://api-channel.sooplive.com/v1.1/channel/${SOOP_ID}/home/section/broad`;

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "관리자 로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase 환경 변수가 없습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. SOOP 공개 API에서 현재 방송 정보 조회
    const response = await fetch(SOOP_API, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("SOOP public API error:", response.status);

      return NextResponse.json(
        { error: "SOOP 공개 방송 정보 조회에 실패했습니다." },
        { status: 502 }
      );
    }

    const responseText = await response.text();
    const checkedAt = new Date().toISOString();

    // 2. 응답이 비어 있으면 방송 종료 상태로 판단
    if (!responseText.trim()) {
      const { data: activeSession, error: findError } =
        await supabase
          .from("broadcast_sessions")
          .select("*")
          .eq("streamer_id", SOOP_ID)
          .eq("status", "live")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (findError) {
        console.error("Active session lookup error:", findError);

        return NextResponse.json(
          { error: "진행 중인 방송 기록 조회에 실패했습니다." },
          { status: 500 }
        );
      }

      if (!activeSession) {
        return NextResponse.json({
          success: true,
          status: "streamend",
          message: "현재 방송 중이 아닙니다.",
          endedCount: 0,
        });
      }

      const { error: endError } = await supabase
        .from("broadcast_sessions")
        .update({
          status: "completed",
          ended_at: checkedAt,
          last_checked_at: checkedAt,
          updated_at: checkedAt,
        })
        .eq("id", activeSession.id)
        .eq("status", "live");

      if (endError) {
        console.error("Broadcast end error:", endError);

        return NextResponse.json(
          { error: "방송 종료 기록에 실패했습니다." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        status: "streamend",
        message: "방송 종료를 확인했습니다.",
        endedCount: 1,
        sessionId: activeSession.id,
      });
    }

    // 3. 방송 정보 JSON 파싱
    let live;

    try {
      live = JSON.parse(responseText);
    } catch {
      console.error("SOOP response parse error:", responseText);

      return NextResponse.json(
        { error: "SOOP 방송 정보 형식이 올바르지 않습니다." },
        { status: 502 }
      );
    }

    if (
      !live ||
      !live.broadNo ||
      !live.broadStart
    ) {
      console.error("Invalid SOOP broadcast data:", live);

      return NextResponse.json(
        { error: "방송 번호 또는 시작 시간이 없습니다." },
        { status: 502 }
      );
    }

    // broadStart는 ISO 8601 UTC 형식
    const startedAt = new Date(live.broadStart);

    if (Number.isNaN(startedAt.getTime())) {
      return NextResponse.json(
        { error: "방송 시작 시간 형식이 올바르지 않습니다." },
        { status: 502 }
      );
    }

    // 4. 방송 기록 저장
    const { data: session, error: saveError } = await supabase
      .from("broadcast_sessions")
      .upsert(
        {
          streamer_id: SOOP_ID,
          broadcast_no: String(live.broadNo),
          title: live.broadTitle ?? null,
          category: String(live.broadCateNo ?? ""),
          started_at: startedAt.toISOString(),
          status: "live",
          source: "soop_public_api",
          last_checked_at: checkedAt,
          updated_at: checkedAt,
        },
        {
          onConflict: "streamer_id,broadcast_no",
        }
      )
      .select()
      .single();

    if (saveError) {
      console.error("Broadcast save error:", saveError);

      return NextResponse.json(
        { error: "방송 기록 저장에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "streaming",
      message: "방송 정보를 확인하고 저장했습니다.",
      broadcast: {
        broadcastNo: String(live.broadNo),
        title: live.broadTitle,
        startedAt: startedAt.toISOString(),
        category: live.broadCateNo,
        categoryName: live.categoryName,
        viewerCount: live.currentSumViewer,
      },
      session,
    });
  } catch (error) {
    console.error("Live status API error:", error);

    return NextResponse.json(
      { error: "방송 상태 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
