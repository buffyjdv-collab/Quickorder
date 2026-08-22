import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/get-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { businessId } = await requireAuth();
    const tables = await db.table.findMany({ where: { businessId }, orderBy: { name: "asc" } });
    return NextResponse.json(tables);
  } catch (e: any) {
    const status = e.message === "Unauthorized" || e.message === "No business assigned" ? 401 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
