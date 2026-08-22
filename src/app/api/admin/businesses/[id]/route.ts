import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/get-session";
import { serializeBusiness } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const biz = await db.business.findUnique({ where: { id }, include: { _count: { select: { users: true, tables: true, billingCycles: true } } } });
    if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    return NextResponse.json(serializeBusiness(biz));
  } catch (e: any) {
    const status = e.message === "Unauthorized" || e.message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { name, type, tagline, description, logoEmoji, coverColor, phone, address, upiId, currency, taxRate, serviceFee, openHours, platformFeeRate, enabled, defaulter } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = type;
    if (tagline !== undefined) data.tagline = tagline;
    if (description !== undefined) data.description = description;
    if (logoEmoji !== undefined) data.logoEmoji = logoEmoji;
    if (coverColor !== undefined) data.coverColor = coverColor;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;
    if (upiId !== undefined) data.upiId = upiId;
    if (currency !== undefined) data.currency = currency;
    if (taxRate !== undefined) data.taxRate = taxRate;
    if (serviceFee !== undefined) data.serviceFee = serviceFee;
    if (openHours !== undefined) data.openHours = openHours;
    if (platformFeeRate !== undefined) data.platformFeeRate = platformFeeRate;
    if (enabled !== undefined) data.enabled = enabled;
    if (defaulter !== undefined) data.defaulter = defaulter;

    const business = await db.business.update({ where: { id }, data });
    return NextResponse.json(serializeBusiness(business));
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Business not found" }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.business.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Business not found" }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
