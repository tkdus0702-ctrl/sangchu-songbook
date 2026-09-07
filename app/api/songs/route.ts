import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// ==================== 노래 추가 ====================

export async function POST(request: Request) {
  const admin = await isAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "관리자만 노래를 추가할 수 있습니다.",
      },
      { status: 403 }
    );
  }

  try {
    const {
      title,
      artist,
      level,
      category,
      difficulty,
    } = await request.json();

    if (!title || !artist) {
      return NextResponse.json(
        {
          success: false,
          message: "노래 제목과 아티스트를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("songs")
      .insert({
        title,
        artist,
        level: level || null,
        category: category || null,
        difficulty: difficulty || null,
      })
      .select()
      .single();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          message: "노래 저장에 실패했습니다.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      song: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "잘못된 요청입니다.",
      },
      { status: 400 }
    );
  }
}


// ==================== 노래 수정 ====================

export async function PATCH(request: Request) {
  const admin = await isAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "관리자만 노래를 수정할 수 있습니다.",
      },
      { status: 403 }
    );
  }

  try {
    const {
      id,
      title,
      artist,
      level,
      category,
      difficulty,
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "수정할 노래의 ID가 필요합니다.",
        },
        { status: 400 }
      );
    }

    if (!title || !artist) {
      return NextResponse.json(
        {
          success: false,
          message: "노래 제목과 아티스트를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("songs")
      .update({
        title,
        artist,
        level: level || null,
        category: category || null,
        difficulty: difficulty || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          message: "노래 수정에 실패했습니다.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      song: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "잘못된 요청입니다.",
      },
      { status: 400 }
    );
  }
}


// ==================== 노래 삭제 ====================

export async function DELETE(request: Request) {
  const admin = await isAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "관리자만 노래를 삭제할 수 있습니다.",
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        message: "삭제할 노래의 ID가 필요합니다.",
      },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("songs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "노래 삭제에 실패했습니다.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}