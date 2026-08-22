import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/get-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = { month };
    if (status && status !== "all") where.status = status;

    const cycles = await db.billingCycle.findMany({
      where,
      include: { business: { select: { id: true, name: true, logoEmoji: true, platformFeeRate: true } } },
      orderBy: { createdAt: "desc" },
    });

    const summary = cycles.reduce((acc, c) => {
      acc.totalRevenue += c.totalRevenue;
      acc.totalFees += c.feeAmount;
      acc.paid += c.status === "paid" ? c.feeAmount : 0;
      acc.pending += c.status !== "paid" ? c.feeAmount : 0;
      return acc;
    }, { totalRevenue: 0, totalFees: 0, paid: 0, pending: 0 });

    return NextResponse.json({
      cycles: cycles.map(c => ({
        id: c.id, businessId: c.businessId, month: c.month,
        business: c.business,
        totalRevenue: +c.totalRevenue.toFixed(2),
        feeRate: c.feeRate,
        feeAmount: +c.feeAmount.toFixed(2),
        status: c.status, paidAt: c.paidAt,
      })),
      summary: {
        totalRevenue: +summary.totalRevenue.toFixed(2),
        totalFees: +summary.totalFees.toFixed(2),
        paid: +summary.paid.toFixed(2),
        pending: +summary.pending.toFixed(2),
      },
    });
  } catch (e: any) {
    const status = e.message === "Unauthorized" || e.message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { month } = body;
    const m = month || new Date().toISOString().slice(0, 7);

    const startDate = new Date(`${m}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);

    const businesses = await db.business.findMany();
    let created = 0;

    for (const biz of businesses) {
      const existing = await db.billingCycle.findFirst({ where: { businessId: biz.id, month: m } });
      if (existing) continue;

      const completed = await db.order.aggregate({
        where: { businessId: biz.id, createdAt: { gte: startDate, lt: endDate }, status: "completed" },
        _sum: { total: true },
      });
      const totalRevenue = completed._sum.total || 0;
      const feeAmount = +(totalRevenue * biz.platformFeeRate / 100).toFixed(2);

      await db.billingCycle.create({
        data: { businessId: biz.id, month: m, totalRevenue, feeRate: biz.platformFeeRate, feeAmount, status: "pending" },
      });
      created++;
    }

    return NextResponse.json({ message: `Generated ${created} billing cycles for ${m}`, created });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

    const data: Record<string, unknown> = { status };
    if (status === "paid") data.paidAt = new Date();

    const cycle = await db.billingCycle.update({ where: { id }, data });
    return NextResponse.json({ id: cycle.id, status: cycle.status, paidAt: cycle.paidAt });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Billing cycle not found" }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
