import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const businessId = "biz_teahub";
    const categories = await db.category.findMany({ where: { businessId }, include: { products: { where: { businessId }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json(categories);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}