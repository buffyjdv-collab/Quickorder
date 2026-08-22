import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/get-session";
import { serializeBusiness } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (type) where.type = type;
    if (status === "active") where.enabled = true;
    if (status === "disabled") where.enabled = false;
    if (status === "defaulter") where.defaulter = true;

    const businesses = await db.business.findMany({
      where,
      include: { _count: { select: { users: true, tables: true, billingCycles: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(businesses.map(serializeBusiness));
  } catch (e: any) {
    const status = e.message === "Unauthorized" || e.message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, type, tagline, description, logoEmoji, coverColor, phone, address, upiId, currency, taxRate, serviceFee, openHours, platformFeeRate } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Business name is required" }, { status: 400 });

    const id = `biz_${name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/(^_|_$)/g, "")}_${Date.now().toString(36)}`;

    const business = await db.business.create({
      data: {
        id, name: name.trim(), type: type || "restaurant", tagline, description,
        logoEmoji: logoEmoji || "\uD83C\uDF7D\uFE0F", coverColor: coverColor || "emerald",
        phone, address, upiId, currency: currency || "\u20B9",
        taxRate: taxRate ?? 5.0, serviceFee: serviceFee ?? 0.0,
        openHours, platformFeeRate: platformFeeRate ?? 2.0,
      },
    });
    return NextResponse.json(serializeBusiness(business), { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Business ID collision, try again" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}