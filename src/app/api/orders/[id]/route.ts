import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await db.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(serializeOrder(order));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const order = await db.order.update({ where: { id }, data: body, include: { items: true } });
    return NextResponse.json(serializeOrder(order));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
