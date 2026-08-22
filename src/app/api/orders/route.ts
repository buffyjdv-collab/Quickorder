import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") || "biz_teahub";
    const status = searchParams.get("status");
    const limit = Number(searchParams.get("limit") || "200");
    const where: Record<string, unknown> = { businessId };
    if (status && status !== "all") where.status = status;
    const orders = await db.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(orders.map(serializeOrder));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}