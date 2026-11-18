
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/admin";

// 방송 일정 조회
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("stream_schedule")
    .select("*")
    .order("stream_date", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    schedules: data,
  });
}

// 방송 일정 추가
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from("stream_schedule")
      .insert({
        status: body.status,
        title: body.title || null,
        stream_date: body.stream_date,
        scheduled_time: body.scheduled_time || null,
        duration_minutes: body.duration_minutes ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, schedule: data });
  } catch (error) {
    console.error("방송 일정 추가 오류:", error);

    return NextResponse.json(
      { success: false, message: "방송 일정 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 방송 일정 수정
export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from("stream_schedule")
      .update({
        status: body.status,
        title: body.title || null,
        stream_date: body.stream_date,
        scheduled_time: body.scheduled_time || null,
        duration_minutes: body.duration_minutes ?? null,
        is_manually_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, schedule: data });
  } catch (error) {
    console.error("방송 일정 수정 오류:", error);

    return NextResponse.json(
      { success: false, message: "방송 일정 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 방송 일정 삭제
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const { id } = await request.json();

    const { error } = await supabaseAdmin
      .from("stream_schedule")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("방송 일정 삭제 오류:", error);

    return NextResponse.json(
      { success: false, message: "방송 일정 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
