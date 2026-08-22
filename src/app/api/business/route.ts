import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeBusiness } from "@/lib/serialize";
import { requireAuth } from "@/lib/get-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { businessId } = await requireAuth();
    const biz = await db.business.findUnique({ where: { id: businessId } });
    if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    return NextResponse.json(serializeBusiness(biz));
  } catch (e: any) {
    const status = e.message === "Unauthorized" || e.message === "No business assigned" ? 401 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
