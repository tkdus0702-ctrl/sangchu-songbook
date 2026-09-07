import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await isAdmin();

  return NextResponse.json({
    success: admin,
  });
}