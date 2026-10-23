
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "관리자 로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      {
        error: "인증 코드가 없습니다.",
        detail: url.searchParams.get("error"),
      },
      { status: 400 }
    );
  }

  const clientId = process.env.SOOP_CLIENT_ID;
  const clientSecret = process.env.SOOP_CLIENT_SECRET;
  const redirectUri = process.env.SOOP_REDIRECT_URI;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !supabaseUrl ||
    !supabaseKey
  ) {
    return NextResponse.json(
      { error: "서버 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(
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

    const tokenData = await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenData.access_token ||
      !tokenData.refresh_token
    ) {
      console.error("SOOP token exchange failed:", tokenResponse.status);

      return NextResponse.json(
        { error: "SOOP 토큰 발급에 실패했습니다." },
        { status: 502 }
      );
    }

    const expiresIn = Number(tokenData.expires_in);

    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      return NextResponse.json(
        { error: "SOOP 토큰 만료 시간이 올바르지 않습니다." },
        { status: 502 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from("soop_auth_tokens")
      .upsert(
        {
          id: "main",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(
            Date.now() + expiresIn * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("SOOP token storage failed:", error.message);

      return NextResponse.json(
        { error: "토큰 저장에 실패했습니다. 서버 로그를 확인해 주세요." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(
      new URL("/?soop=connected", request.url)
    );
  } catch (error) {
    console.error("SOOP callback failed:", error);

    return NextResponse.json(
      { error: "SOOP 인증 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
