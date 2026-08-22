import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serialize";
import { requireAuth } from "@/lib/get-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuth();
    const { searchParams } = new URL(req.url);
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
    const status = msg === "Unauthorized" || msg === "No business assigned" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}