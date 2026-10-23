
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
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
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("soop_auth_tokens")
    .select("access_token, expires_at")
    .eq("id", "main")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "SOOP 토큰을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const expiresAt = new Date(data.expires_at).getTime();

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + 60_000) {
    return NextResponse.json(
      { error: "토큰이 만료되었거나 곧 만료됩니다. 다시 인증해 주세요." },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { accessToken: data.access_token },
    {
      headers: {
        "Cache-Control": "no-store, private",
        "Vary": "Cookie",
      },
    }
  );
}
