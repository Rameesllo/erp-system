import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest } from "@/lib/auth";

function getDateRange(period: string): { gte: Date; lte: Date } | undefined {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: now };
    case "week":
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: now };
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: now };
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: now };
    default:
      return undefined;
  }
}

export async function GET(request: Request) {
  try {
    const auth = verifyRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const dateRange = getDateRange(period);
    const dateFilter = dateRange ? { createdAt: dateRange } : {};

    const [
      revenueResult,
      orderCount,
      customerCount,
      productCount,
      lowStockProducts,
      outOfStockProducts,
      recentOrders,
      topProducts,
      revenueByDay,
    ] = await Promise.all([
      // Total revenue from completed orders in period
      prisma.order.aggregate({
        where: { status: "COMPLETED", ...dateFilter },
        _sum: { totalAmount: true },
      }),
      // Order count in period
      prisma.order.count({ where: { ...dateFilter } }),
      // Total active customers
      prisma.customer.count(),
      // Total active products
      prisma.product.count({ where: { isActive: true } }),
      // Low stock (stock > 0 but <= minStock)
      prisma.product.findMany({
        where: { isActive: true, stock: { gt: 0 } },
        select: { stock: true, minStock: true },
      }).then(prods => prods.filter(p => p.minStock > 0 && p.stock <= p.minStock).length),
      // Out of stock
      prisma.product.count({ where: { isActive: true, stock: 0 } }),
      // Recent 5 orders
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true } },
          invoice: { select: { status: true } },
          payments: { select: { amount: true, status: true } },
        },
      }),
      // Top 5 products by units sold
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }).then(async (groups) => {
        const ids = groups.map((g) => g.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, sku: true },
        });
        return groups.map((g) => ({
          product: products.find((p) => p.id === g.productId),
          unitsSold: g._sum.quantity || 0,
          revenue: g._sum.total || 0,
        }));
      }),
      // Revenue last 7 days for chart
      prisma.order.findMany({
        where: { status: "COMPLETED", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build day-by-day chart data
    const dayMap: Record<string, { revenue: number; orders: number }> = {};
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dayMap[key] = { revenue: 0, orders: 0 };
      return key;
    });
    revenueByDay.forEach((o) => {
      const key = o.createdAt.toISOString().split("T")[0];
      if (dayMap[key]) {
        dayMap[key].revenue += o.totalAmount;
        dayMap[key].orders += 1;
      }
    });
    const chartData = days.map((day) => ({
      date: day,
      label: new Date(day + "T12:00:00Z").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }),
      revenue: Math.round(dayMap[day]?.revenue * 100) / 100,
      orders: dayMap[day]?.orders || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        revenue: revenueResult._sum.totalAmount || 0,
        orderCount,
        customerCount,
        productCount,
        lowStockCount: lowStockProducts,
        outOfStockCount: outOfStockProducts,
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          customer: o.customer.name,
          amount: o.totalAmount,
          status: o.status,
          paymentStatus: o.invoice?.status || "UNPAID",
          date: o.createdAt,
        })),
        topProducts,
        chartData,
        period,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}
