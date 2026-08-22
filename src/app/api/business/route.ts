import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeBusiness } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const biz = await db.business.findFirst({ where: { id: "biz_teahub" } });
    if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    return NextResponse.json(serializeBusiness(biz));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
