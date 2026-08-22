import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const passwordHash = await hash("admin123", 10);
    await db.user.upsert({ where: { email: "admin@quickorder.in" }, update: {}, create: { email: "admin@quickorder.in", name: "Admin", passwordHash, role: "SUPER_ADMIN" } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
