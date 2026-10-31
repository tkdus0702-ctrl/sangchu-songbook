import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// 카테고리 목록 조회: 누구나 가능
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("song_categories")
    .select("id, name, position")
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    categories: data ?? [],
  });
}

// 카테고리 추가: 관리자만 가능
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "카테고리 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    if (name.includes(",")) {
      return NextResponse.json(
        { success: false, message: "카테고리 이름에는 쉼표를 사용할 수 없습니다." },
        { status: 400 }
      );
    }

    const { data: lastCategory } = await supabaseAdmin
      .from("song_categories")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from("song_categories")
      .insert({
        name,
        position: (lastCategory?.position ?? 0) + 1,
      })
      .select("id, name, position")
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.code === "23505"
            ? "이미 존재하는 카테고리입니다."
            : error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, category: data });
  } catch (error) {
    console.error("[카테고리 추가 오류]", error);
    return NextResponse.json(
      { success: false, message: "카테고리 추가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 카테고리 이름 변경: 관리자만 가능
export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const oldName = String(body.oldName ?? "").trim();
    const newName = String(body.newName ?? "").trim();

    if (!oldName || !newName) {
      return NextResponse.json(
        { success: false, message: "변경할 카테고리 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    if (newName.includes(",")) {
      return NextResponse.json(
        { success: false, message: "카테고리 이름에는 쉼표를 사용할 수 없습니다." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.rpc("rename_song_category", {
      old_name: oldName,
      new_name: newName,
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[카테고리 변경 오류]", error);
    return NextResponse.json(
      { success: false, message: "카테고리 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 카테고리 삭제: 관리자만 가능
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "삭제할 카테고리를 선택해주세요." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.rpc("delete_song_category", {
      target_name: name,
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[카테고리 삭제 오류]", error);
    return NextResponse.json(
      { success: false, message: "카테고리 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}