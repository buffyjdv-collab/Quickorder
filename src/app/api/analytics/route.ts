import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Analytics } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const businessId = "biz_teahub";
    const orders = await db.order.findMany({ where: { businessId }, include: { items: true } });
    const tables = await db.table.findMany({ where: { businessId } });
    const products = await db.product.findMany({ where: { businessId } });

    const completed = orders.filter(o => o.status === "completed");
    const totalRevenue = completed.reduce((s, o) => s + o.total, 0);
    const avgOrderValue = completed.length ? totalRevenue / completed.length : 0;
    const activeOrders = orders.filter(o => ["received", "accepted", "preparing", "ready"].includes(o.status)).length;

    const productMap = new Map<string, { name: string; emoji: string; count: number; revenue: number }>();
    for (const o of orders) {
      for (const it of o.items) {
        const existing = productMap.get(it.productName) || { name: it.productName, emoji: it.productEmoji, count: 0, revenue: 0 };
        existing.count += it.quantity;
        existing.revenue += it.totalPrice;
        productMap.set(it.productName, existing);
      }
    }
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.count - a.count).slice(0, 6);

    const statusMap = new Map<string, number>();
    for (const o of orders) statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
    const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    const now = new Date();
    const revenueByDay: { day: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - i);
      const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
      const dayOrders = orders.filter(o => { const d = o.createdAt; return d >= day && d < nextDay && o.status === "completed"; });
      revenueByDay.push({ day: day.toLocaleDateString("en-IN", { weekday: "short" }), revenue: +dayOrders.reduce((s, o) => s + o.total, 0).toFixed(2), orders: dayOrders.length });
    }

    const paymentMap = new Map<string, { count: number; revenue: number }>();
    for (const o of completed) {
      const e = paymentMap.get(o.paymentMethod) || { count: 0, revenue: 0 };
      e.count += 1; e.revenue += o.total;
      paymentMap.set(o.paymentMethod, e);
    }
    const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, v]) => ({ method, ...v }));

    const analytics: Analytics & { tableCount: number; productCount: number; lowStock: any[]; avgPrepTime: number } = {
      totalRevenue: +totalRevenue.toFixed(2), totalOrders: orders.length,
      avgOrderValue: +avgOrderValue.toFixed(2), completedOrders: completed.length,
      activeOrders, cancelledOrders: orders.filter(o => o.status === "cancelled").length,
      topProducts, ordersByStatus, revenueByDay, paymentBreakdown,
      tableCount: tables.length, productCount: products.length,
      lowStock: products.filter(p => p.trackStock && p.stockQty <= 5).map(p => ({ id: p.id, name: p.name, emoji: p.emoji, stockQty: p.stockQty, available: p.available })),
      avgPrepTime: products.reduce((s, p) => s + p.prepTime, 0) / (products.length || 1),
    };
    return NextResponse.json(analytics);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}