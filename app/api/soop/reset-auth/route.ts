
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST() {
  const admin = await isAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "관리자 로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "서버 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from("soop_auth_tokens")
    .delete()
    .eq("id", "main");

  if (error) {
    console.error("SOOP auth reset failed:", error.message);

    return NextResponse.json(
      { error: "SOOP 인증 초기화에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
