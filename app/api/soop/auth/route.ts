
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const admin = await isAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "관리자 로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const clientId = process.env.SOOP_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "SOOP_CLIENT_ID 환경 변수가 없습니다." },
      { status: 500 }
    );
  }

  const authUrl = new URL("https://openapi.sooplive.com/auth/code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "broad_access_chatinfo");

  return NextResponse.redirect(authUrl);
}
