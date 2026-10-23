
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// 제목 비교용: 대소문자, 띄어쓰기, 문장부호 차이 무시
function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

// SOOP 채팅의 !요청 명령을 처리
export async function POST(request: Request) {
  // 관리자 방송 페이지에서 전달된 요청만 허용
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

  const requestedTitle = String(body.title ?? "").trim();
  const soopUserId = String(body.userId ?? "").trim();

  if (
    !requestedTitle ||
    requestedTitle.length > 300 ||
    !soopUserId ||
    soopUserId.length > 90
  ) {
    return NextResponse.json(
      { message: "노래 제목 또는 시청자 정보가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const searchTitle = normalizeTitle(requestedTitle);

  if (!searchTitle) {
    return NextResponse.json(
      { message: "검색할 제목을 입력해 주세요." },
      { status: 400 }
    );
  }

  // 노래책에서 곡 목록을 가져옴
  const { data: songs, error: songsError } = await supabaseAdmin
    .from("songs")
    .select("*")
    .limit(2000);

  if (songsError) {
    console.error("노래책 검색 오류:", songsError);

    return NextResponse.json(
      { message: "노래책 검색에 실패했습니다." },
      { status: 500 }
    );
  }

  const allSongs = songs ?? [];

  // 1순위: 제목이 정확히 일치하는 곡
  const exactMatches = allSongs.filter((song) => {
    return (
      typeof song.title === "string" &&
      normalizeTitle(song.title) === searchTitle
    );
  });

  let matchedSong: any = null;

  if (exactMatches.length === 1) {
    matchedSong = exactMatches[0];
  } else if (exactMatches.length > 1) {
    return NextResponse.json(
      { message: "같은 제목의 곡이 여러 개 있어 자동 등록하지 않았습니다." },
      { status: 409 }
    );
  } else {
    // 2순위: 제목 일부가 일치하는 곡
    // 너무 짧은 입력은 오매칭 방지를 위해 허용하지 않음
    if (searchTitle.length < 2) {
      return NextResponse.json(
        { message: "제목을 조금 더 입력해 주세요." },
        { status: 404 }
      );
    }

    const partialMatches = allSongs.filter((song) => {
      if (typeof song.title !== "string") return false;

      return normalizeTitle(song.title).includes(searchTitle);
    });

    if (partialMatches.length === 1) {
      matchedSong = partialMatches[0];
    } else if (partialMatches.length > 1) {
      return NextResponse.json(
        { message: "일치하는 곡이 여러 개 있어 자동 등록하지 않았습니다." },
        { status: 409 }
      );
    }
  }

  if (!matchedSong) {
    return NextResponse.json(
      { message: "노래책에서 해당 제목을 찾지 못했습니다." },
      { status: 404 }
    );
  }

  const songId = String(matchedSong.id);
  const requesterId = `soop:${soopUserId}`;

  // 같은 시청자가 같은 곡을 중복 요청했는지 확인
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("song_requests")
    .select("id")
    .eq("song_id", songId)
    .eq("requester_id", requesterId)
    .eq("status", "pending")
    .maybeSingle();

  if (lookupError) {
    console.error("중복 요청 확인 오류:", lookupError);

    return NextResponse.json(
      { message: "중복 요청 확인에 실패했습니다." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(
      { message: "이미 요청 대기 중인 곡입니다." },
      { status: 409 }
    );
  }

  const difficulty = Number(matchedSong.difficulty);

  // 기존 song_requests 테이블에 등록
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("song_requests")
    .insert({
      song_id: songId,
      title: matchedSong.title,
      artist: matchedSong.artist,
      song_key: matchedSong.song_key ?? matchedSong.key ?? null,
      level: matchedSong.level ?? null,
      category: matchedSong.category ?? null,
      difficulty:
        Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5
          ? difficulty
          : null,
      requester_id: requesterId,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { message: "이미 요청 대기 중인 곡입니다." },
        { status: 409 }
      );
    }

    console.error("SOOP 노래 요청 등록 오류:", insertError);

    return NextResponse.json(
      { message: "노래 요청 등록에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "노래 요청이 등록되었습니다.",
    request: inserted,
  });
}
