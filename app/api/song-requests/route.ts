import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// 관리자만 대기 요청 목록을 조회할 수 있음
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("song_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("노래 요청 조회 오류:", error);
    return NextResponse.json(
      { message: "요청 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ requests: data ?? [] });
}

// 방문자 노래 요청 등록
export async function POST(request: Request) {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const songId = String(body.song_id ?? "").trim();
  const title = String(body.title ?? "").trim();
  const artist = String(body.artist ?? "").trim();
  const requesterId = String(body.requester_id ?? "").trim();

  if (
    !songId || !title || !artist || !requesterId ||
    songId.length > 100 || title.length > 300 ||
    artist.length > 300 || requesterId.length > 100
  ) {
    return NextResponse.json(
      { message: "노래 정보가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  // 같은 방문자가 동일 곡을 여러 번 대기 요청하지 못하게 함
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("song_requests")
    .select("id")
    .eq("song_id", songId)
    .eq("requester_id", requesterId)
    .eq("status", "pending")
    .maybeSingle();

  if (lookupError) {
    console.error("노래 요청 중복 확인 오류:", lookupError);
    return NextResponse.json(
      { message: "요청 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(
      { message: "이미 요청 대기 중인 노래입니다." },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("song_requests")
    .insert({
      song_id: songId,
      title,
      artist,
      song_key: body.key ? String(body.key).slice(0, 50) : null,
      level: body.level ? String(body.level).slice(0, 50) : null,
      category: body.category ? String(body.category).slice(0, 50) : null,
      difficulty: Number.isInteger(body.difficulty) && body.difficulty >= 1 && body.difficulty <= 5
        ? body.difficulty
        : null,
      requester_id: requesterId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { message: "이미 요청 대기 중인 노래입니다." },
        { status: 409 }
      );
    }

    console.error("노래 요청 등록 오류:", error);
    return NextResponse.json(
      { message: "요청 등록에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, request: data });
}

// 관리자만 요청을 Queue에 반영 완료 또는 거절 처리할 수 있음
export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const id = Number(body.id);
  const status = body.status;

  if (!Number.isInteger(id) || id <= 0 || !["added", "rejected"].includes(status)) {
    return NextResponse.json(
      { message: "요청 정보가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("song_requests")
    .update({ status })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("노래 요청 처리 오류:", error);
    return NextResponse.json(
      { message: "요청 처리에 실패했습니다." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { message: "이미 처리된 요청입니다." },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
