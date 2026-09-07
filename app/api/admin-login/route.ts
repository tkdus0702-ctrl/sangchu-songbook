import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "비밀번호를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          message: "비밀번호가 올바르지 않습니다.",
        },
        { status: 401 }
      );
    }

    const token = crypto
      .createHash("sha256")
      .update(
        password +
          process.env.ADMIN_PASSWORD +
          "yusangchu-songbook-admin"
      )
      .digest("hex");

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "잘못된 요청입니다.",
      },
      { status: 400 }
    );
  }
}