import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RevenueDetail } from "@/lib/types";
import { requireAuth } from "@/lib/get-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";
    const date = searchParams.get("date") || new Date().toISOString();
    const sortBy = searchParams.get("sortBy") || "revenue";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const targetDate = new Date(date);
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    if (period === "day") {
      startDate = new Date(targetDate); startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1);
      periodLabel = startDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
    } else if (period === "month") {
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);
      periodLabel = startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    } else {
      startDate = new Date(targetDate.getFullYear(), 0, 1);
      endDate = new Date(targetDate.getFullYear() + 1, 0, 1);
      periodLabel = String(targetDate.getFullYear());
    }

    const orders = await db.order.findMany({
      where: { businessId, createdAt: { gte: startDate, lt: endDate }, status: "completed" },
      include: { items: true },
      orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
    });

    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    const catMap = new Map<string, { categoryName: string; categoryEmoji: string | null; revenue: number; orders: Set<string>; products: Set<string> }>();
    const prodMap = new Map<string, { productName: string; productEmoji: string; categoryName: string; revenue: number; quantity: number }>();

    for (const o of orders) {
      for (const it of o.items) {
        const pKey = it.productId;
        const pExisting = prodMap.get(pKey) || { productName: it.productName, productEmoji: it.productEmoji, categoryName: "", revenue: 0, quantity: 0 };
        pExisting.revenue += it.totalPrice;
        pExisting.quantity += it.quantity;
        prodMap.set(pKey, pExisting);
      }
    }

    const productIds = Array.from(prodMap.keys());
    const productRecords = productIds.length > 0 ? await db.product.findMany({ where: { id: { in: productIds } }, include: { category: true } }) : [];
    const productCategoryMap = new Map(productRecords.map(p => [p.id, p.category?.name || "Uncategorized"]));
    const categoryEmojiMap = new Map<string, string | null>();
    for (const p of productRecords) {
      if (p.category && !categoryEmojiMap.has(p.category.name)) categoryEmojiMap.set(p.category.name, p.category.emoji);
    }
    for (const [key, val] of prodMap) {
      val.categoryName = productCategoryMap.get(key) || "Uncategorized";
    }

    for (const [, pVal] of prodMap) {
      const cKey = pVal.categoryName;
      const cExisting = catMap.get(cKey) || { categoryName: cKey, categoryEmoji: categoryEmojiMap.get(cKey) || null, revenue: 0, orders: new Set<string>(), products: new Set<string>() };
      cExisting.revenue += pVal.revenue;
      cExisting.products.add(pVal.productName);
      catMap.set(cKey, cExisting);
    }
    for (const o of orders) {
      for (const it of o.items) {
        const catName = productCategoryMap.get(it.productId) || "Uncategorized";
        const c = catMap.get(catName);
        if (c) c.orders.add(o.id);
      }
    }

    const sortFn = (a: any, b: any) => {
      const mul = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "revenue") return (a.revenue - b.revenue) * mul;
      if (sortBy === "orders") return ((a.orders instanceof Set ? a.orders.size : a.orders) - (b.orders instanceof Set ? b.orders.size : b.orders)) * mul;
      return 0;
    };

    const categoryBreakdown = Array.from(catMap.values()).map(c => ({
      categoryName: c.categoryName, categoryEmoji: c.categoryEmoji,
      revenue: +c.revenue.toFixed(2), orders: c.orders.size, productCount: c.products.size,
    })).sort(sortFn);

    const productBreakdown = Array.from(prodMap.values()).map(p => ({
      productName: p.productName, productEmoji: p.productEmoji,
      categoryName: p.categoryName, revenue: +p.revenue.toFixed(2), quantity: p.quantity,
    })).sort((a, b) => {
      const mul = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "revenue") return (a.revenue - b.revenue) * mul;
      if (sortBy === "orders") return (a.quantity - b.quantity) * mul;
      return 0;
    });

    const dailyMap = new Map<string, { date: string; revenue: number; orders: number }>();
    for (const o of orders) {
      const dKey = o.createdAt.toISOString().split("T")[0];
      const existing = dailyMap.get(dKey) || { date: dKey, revenue: 0, orders: 0 };
      existing.revenue += o.total; existing.orders += 1;
      dailyMap.set(dKey, existing);
    }
    const dailyBreakdown = Array.from(dailyMap.values()).map(d => ({
      ...d, date: new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" }),
      avgOrderValue: d.orders ? +(d.revenue / d.orders).toFixed(2) : 0,
    })).sort((a, b) => {
      const mul = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "date") return (new Date(a.date).getTime() - new Date(b.date).getTime()) * mul;
      if (sortBy === "revenue") return (a.revenue - b.revenue) * mul;
      return 0;
    });

    const result: RevenueDetail = {
      period: periodLabel, totalRevenue: +totalRevenue.toFixed(2),
      totalOrders, avgOrderValue: +avgOrderValue.toFixed(2),
      categoryBreakdown, productBreakdown, dailyBreakdown,
    };
    return NextResponse.json(result);
  } catch (e: any) {
    const status = e.message === "Unauthorized" || e.message === "No business assigned" ? 401 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}