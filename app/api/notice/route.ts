import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// 공지사항 조회: 누구나 가능
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("songbook_notice")
    .select("id,title,content,updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    notice: data ?? {
      title: "노래책 필독사항",
      content: "노래 신청 전 필독사항을 확인해주세요!",
    },
  });
}

// 공지사항 수정: 관리자만 가능
export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));

  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (!title || !content) {
    return NextResponse.json(
      { message: "제목과 내용을 모두 입력해주세요." },
      { status: 400 }
    );
  }

  if (title.length > 60 || content.length > 5000) {
    return NextResponse.json(
      { message: "제목은 60자, 내용은 5000자 이내로 입력해주세요." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("songbook_notice")
    .upsert(
      {
        id: 1,
        title,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("id,title,content,updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    notice: data,
  });
}