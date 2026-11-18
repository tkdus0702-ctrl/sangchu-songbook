
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
  const clientId = process.env.SOOP_CLIENT_ID;
  const clientSecret = process.env.SOOP_CLIENT_SECRET;

  if (!supabaseUrl || !supabaseKey || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: "서버 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from("soop_auth_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("id", "main")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "SOOP 토큰을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const expiresAt = new Date(data.expires_at).getTime();

    // 아직 유효한 토큰이면 기존 토큰 사용
    if (
      Number.isFinite(expiresAt) &&
      expiresAt > Date.now() + 60_000
    ) {
      return NextResponse.json(
        { accessToken: data.access_token },
        {
          headers: {
            "Cache-Control": "no-store, private",
            Vary: "Cookie",
          },
        }
      );
    }

    // 만료됐으면 refresh_token으로 갱신
    if (!data.refresh_token) {
      return NextResponse.json(
        { error: "갱신 토큰이 없습니다. SOOP 재인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: data.refresh_token,
    });

    const refreshResponse = await fetch(
      "https://openapi.sooplive.com/auth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        cache: "no-store",
      }
    );

    const tokenData = await refreshResponse.json();

    if (
      !refreshResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        "SOOP token refresh failed:",
        refreshResponse.status,
        tokenData.error ?? "unknown_error"
      );

      return NextResponse.json(
        {
          error: "SOOP 토큰 갱신에 실패했습니다. 재인증이 필요할 수 있습니다.",
        },
        { status: 401 }
      );
    }

    const expiresIn = Number(tokenData.expires_in);

    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      return NextResponse.json(
        { error: "갱신된 토큰의 만료 시간이 올바르지 않습니다." },
        { status: 502 }
      );
    }

    const newRefreshToken =
      tokenData.refresh_token || data.refresh_token;

    const { error: updateError } = await supabase
      .from("soop_auth_tokens")
      .update({
        access_token: tokenData.access_token,
        refresh_token: newRefreshToken,
        expires_at: new Date(
          Date.now() + expiresIn * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", "main");

    if (updateError) {
      console.error(
        "SOOP token update failed:",
        updateError.message
      );

      return NextResponse.json(
        { error: "갱신된 토큰 저장에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { accessToken: tokenData.access_token },
      {
        headers: {
          "Cache-Control": "no-store, private",
          Vary: "Cookie",
        },
      }
    );
  } catch (error) {
    console.error("SOOP token check failed:", error);

    return NextResponse.json(
      { error: "SOOP 토큰 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
