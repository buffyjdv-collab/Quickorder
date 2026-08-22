import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/get-session";
import { hash } from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { name, role, businessId, active, password } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (role !== undefined) data.role = role;
    if (businessId !== undefined) data.businessId = businessId || null;
    if (active !== undefined) data.active = active;
    if (password) data.passwordHash = await hash(password, 12);

    const user = await db.user.update({ where: { id }, data });
    return NextResponse.json({
      id: user.id, email: user.email, name: user.name, role: user.role,
      businessId: user.businessId, active: user.active, createdAt: user.createdAt,
    });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
