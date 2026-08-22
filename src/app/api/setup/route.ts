import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const hash = await bcrypt.hash("admin123", 10);
    await db.user.upsert({ where: { email: "admin@quickorder.in" }, update: {}, create: { email: "admin@quickorder.in", name: "Admin", passwordHash: hash, role: "SUPER_ADMIN" } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
