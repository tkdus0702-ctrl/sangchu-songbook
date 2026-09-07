import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// 좋아요 목록 가져오기
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const { data, error } = await supabaseAdmin
      .from("song_likes")
      .select("song_id, user_id");

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          message: "좋아요 정보를 불러오지 못했습니다.",
        },
        { status: 500 }
      );
    }

    const likes: Record<number, number> = {};
    const likedByMe: Record<number, boolean> = {};

    for (const like of data || []) {
      likes[like.song_id] = (likes[like.song_id] || 0) + 1;

      if (userId && like.user_id === userId) {
        likedByMe[like.song_id] = true;
      }
    }

    return NextResponse.json({
      success: true,
      likes,
      likedByMe,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "좋아요 정보를 불러오는 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}


// 좋아요 추가
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const songId = Number(body.songId);
    const userId = String(body.userId || "");

    if (!songId || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "잘못된 요청입니다.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("song_likes")
      .insert({
        song_id: songId,
        user_id: userId,
      });

    // 이미 좋아요가 되어 있는 경우
    if (error?.code === "23505") {
      return NextResponse.json({
        success: true,
        liked: true,
      });
    }

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          message: "좋아요 등록에 실패했습니다.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      liked: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "좋아요 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}


// 좋아요 취소
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const songId = Number(searchParams.get("songId"));
    const userId = searchParams.get("userId");

    if (!songId || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "잘못된 요청입니다.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("song_likes")
      .delete()
      .eq("song_id", songId)
      .eq("user_id", userId);

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          message: "좋아요 취소에 실패했습니다.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      liked: false,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "좋아요 취소 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}