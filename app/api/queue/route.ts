
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// Queue 조회: 누구나 가능
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("song_queue")
    .select("*")
    .order("position", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Queue 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, queue: data });
}

// Queue 추가: 관리자만 가능
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자만 Queue를 추가할 수 있습니다." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { song_id, title, artist, key, level, category, difficulty } = body;

    if (song_id == null || !title || !artist) {
      return NextResponse.json(
        { success: false, message: "노래 정보가 부족합니다." },
        { status: 400 }
      );
    }

    const { data: existing, error: readError } = await supabaseAdmin
      .from("song_queue")
      .select("position")
      .eq("completed", false)
      .order("position", { ascending: false })
      .limit(1);

    if (readError) throw readError;

    const position = (existing?.[0]?.position ?? -1) + 1;

    const { data, error } = await supabaseAdmin
      .from("song_queue")
      .insert({
        song_id: String(song_id),
        title,
        artist,
        song_key: key || null,
        level: level || null,
        category: category || null,
        difficulty: difficulty ?? null,
        position,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, message: "이미 Queue에 담긴 노래입니다." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Queue 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}

// Queue 수정: 관리자만 가능
export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자만 Queue를 수정할 수 있습니다." },
      { status: 403 }
    );
  }

  try {
    const { id, action, position } = await request.json();

    if (id == null) {
      return NextResponse.json(
        { success: false, message: "Queue 항목 ID가 필요합니다." },
        { status: 400 }
      );
    }

    let update: Record<string, unknown>;

    if (action === "complete") {
      update = { completed: true };
    } else if (action === "reopen") {
      update = { completed: false };
    } else if (
      action === "move" &&
      Number.isInteger(position) &&
      position >= 0
    ) {
      update = { position };
    } else {
      return NextResponse.json(
        { success: false, message: "잘못된 작업입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("song_queue")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Queue 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// Queue 삭제 및 전체 초기화: 관리자만 가능
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자만 Queue를 삭제할 수 있습니다." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const clearAll = searchParams.get("all") === "true";

  // 전체 초기화
  if (clearAll) {
    const { error } = await supabaseAdmin
      .from("song_queue")
      .delete()
      .not("id", "is", null);

    if (error) {
      console.error(error);
      return NextResponse.json(
        { success: false, message: "Queue 전체 초기화에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  // 개별 항목 삭제
  if (!id) {
    return NextResponse.json(
      { success: false, message: "삭제할 Queue 항목 ID가 필요합니다." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("song_queue")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Queue 삭제에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
