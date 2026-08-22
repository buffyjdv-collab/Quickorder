import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tables = await db.table.findMany({ where: { businessId: "biz_teahub" }, orderBy: { name: "asc" } });
    return NextResponse.json(tables);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}