import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/get-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);

    // All businesses summary
    const businesses = await db.business.findMany({
      include: {
        _count: { select: { users: true, tables: true } },
        billingCycles: { where: { month } },
      },
      orderBy: { name: "asc" },
    });

    // Per-business revenue for the period
    const businessRevenues = await db.order.groupBy({
      by: ["businessId"],
      where: { createdAt: { gte: startDate, lt: endDate }, status: "completed" },
      _sum: { total: true },
      _count: true,
    });
    const revMap = new Map(businessRevenues.map(r => [r.businessId, { revenue: r._sum.total || 0, orders: r._count }]));

    // Per-business order counts by status
    const statusCounts = await db.order.groupBy({
      by: ["businessId", "status"],
      where: { createdAt: { gte: startDate, lt: endDate } },
      _count: true,
    });
    const statusMap = new Map<string, Record<string, number>>();
    for (const s of statusCounts) {
      const m = statusMap.get(s.businessId) || {};
      m[s.status] = s._count;
      statusMap.set(s.businessId, m);
    }

    // Monthly trend (last 12 months)
    const monthlyTrend: { month: string; totalRevenue: number; totalOrders: number; platformFee: number; businessCount: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const mKey = mStart.toISOString().slice(0, 7);

      const mRev = await db.order.aggregate({
        where: { createdAt: { gte: mStart, lt: mEnd }, status: "completed" },
        _sum: { total: true }, _count: true,
      });

      const activeBiz = await db.business.count({ where: { createdAt: { lt: mEnd } } });
      const totalRev = mRev._sum.total || 0;
      const avgFee = await db.business.aggregate({ _avg: { platformFeeRate: true } });
      const feeRate = avgFee._avg.platformFeeRate || 2;

      monthlyTrend.push({
        month: mStart.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        totalRevenue: +totalRev.toFixed(2),
        totalOrders: mRev._count,
        platformFee: +(totalRev * feeRate / 100).toFixed(2),
        businessCount: activeBiz,
      });
    }

    // Build per-business rows
    const perBusiness = businesses.map(biz => {
      const rev = revMap.get(biz.id) || { revenue: 0, orders: 0 };
      const statuses = statusMap.get(biz.id) || {};
      const fee = +(rev.revenue * biz.platformFeeRate / 100).toFixed(2);
      const billing = biz.billingCycles[0];
      return {
        id: biz.id, name: biz.name, logoEmoji: biz.logoEmoji, type: biz.type,
        enabled: biz.enabled, defaulter: biz.defaulter,
        revenue: +rev.revenue.toFixed(2), orders: rev.orders,
        platformFee: fee, feeRate: biz.platformFeeRate,
        billingStatus: billing?.status || "unbilled",
        billingPaid: billing?.paidAt || null,
        userCount: biz._count.users, tableCount: biz._count.tables,
        completedOrders: statuses["completed"] || 0,
        cancelledOrders: statuses["cancelled"] || 0,
        activeOrders: (statuses["received"] || 0) + (statuses["accepted"] || 0) + (statuses["preparing"] || 0) + (statuses["ready"] || 0),
      };
    });

    const totals = perBusiness.reduce((acc, b) => {
      acc.revenue += b.revenue; acc.orders += b.orders; acc.platformFee += b.platformFee;
      return acc;
    }, { revenue: 0, orders: 0, platformFee: 0 });

    return NextResponse.json({
      period: month,
      periodLabel: startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      businesses: perBusiness,
      totals: { ...totals, revenue: +totals.revenue.toFixed(2), platformFee: +totals.platformFee.toFixed(2) },
      monthlyTrend,
    });
  } catch (e: any) {
    const status = e.message === "Unauthorized" || e.message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
