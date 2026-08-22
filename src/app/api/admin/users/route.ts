import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/get-session";
import { hash } from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") || "";
    const role = searchParams.get("role") || "";
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (businessId) where.businessId = businessId;
    if (role) where.role = role;
    if (search) where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];

    const users = await db.user.findMany({
      where,
      include: { business: { select: { id: true, name: true, logoEmoji: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users.map(u => ({
      id: u.id, email: u.email, name: u.name, role: u.role,
      businessId: u.businessId, active: u.active, createdAt: u.createdAt, updatedAt: u.updatedAt,
      business: u.business,
    })));
  } catch (e: any) {
    const status = e.message === "Unauthorized" || e.message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { email, name, password, role, businessId } = body;

    if (!email?.trim() || !name?.trim() || !password) {
      return NextResponse.json({ error: "Email, name, and password are required" }, { status: 400 });
    }
    if (!role || !["SUPER_ADMIN", "OWNER", "MANAGER", "STAFF"].includes(role)) {
      return NextResponse.json({ error: "Valid role is required" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

    const passwordHash = await hash(password, 12);
    const user = await db.user.create({
      data: {
        email: email.trim().toLowerCase(), name: name.trim(),
        passwordHash, role: role || "STAFF",
        businessId: businessId || null,
      },
      });
    return NextResponse.json({
      id: user.id, email: user.email, name: user.name, role: user.role,
      businessId: user.businessId, active: user.active, createdAt: user.createdAt,
    }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
