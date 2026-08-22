import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/get-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { businessId } = await requireAuth();
    const categories = await db.category.findMany({ where: { businessId }, include: { products: { where: { businessId }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json(categories);
  } catch (e: any) {
    const status = e.message === "Unauthorized" || e.message === "No business assigned" ? 401 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}