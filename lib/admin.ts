import crypto from "crypto";
import { cookies } from "next/headers";

export async function isAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;

  if (!session || !process.env.ADMIN_PASSWORD) {
    return false;
  }

  const expectedToken = crypto
    .createHash("sha256")
    .update(
      process.env.ADMIN_PASSWORD +
        process.env.ADMIN_PASSWORD +
        "yusangchu-songbook-admin"
    )
    .digest("hex");

  return session === expectedToken;
}