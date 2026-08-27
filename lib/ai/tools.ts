import { prisma } from "@/lib/prisma";
import { AuthUser, requireRole } from "@/lib/auth";

export interface ToolContext {
  user: AuthUser;
}

function parseDateRange(period?: string, startDate?: string, endDate?: string): { gte?: Date; lte?: Date } {
  const now = new Date();
  if (startDate && endDate) {
    return { gte: new Date(startDate), lte: new Date(endDate) };
  }
  if (period) {
    const start = new Date();
    switch (period.toLowerCase()) {
      case "today":
        start.setHours(0, 0, 0, 0);
        return { gte: start, lte: now };
      case "week":
      case "this_week":
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return { gte: start, lte: now };
      case "last_week": {
        const lastWeekEnd = new Date();
        lastWeekEnd.setDate(now.getDate() - now.getDay());
        lastWeekEnd.setHours(0, 0, 0, 0);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        return { gte: lastWeekStart, lte: lastWeekEnd };
      }
      case "month":
      case "this_month":
      case "current_month":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return { gte: start, lte: now };
      case "last_month": {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { gte: lastMonthStart, lte: lastMonthEnd };
      }
      case "year":
      case "this_year":
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        return { gte: start, lte: now };
    }
  }
  // Default to current month if unspecified
  const defaultStart = new Date();
  defaultStart.setDate(1);
  defaultStart.setHours(0, 0, 0, 0);
  return { gte: defaultStart, lte: now };
}

/**
 * 1. getDashboardSummary
 */
export async function getDashboardSummary(params: { period?: string }, ctx: ToolContext) {
  const dateFilter = parseDateRange(params.period);
  const dateQuery = dateFilter.gte ? { createdAt: dateFilter } : {};

  const [
    revenueResult,
    orderCount,
    customerCount,
    productCount,
    lowStockCount,
    outOfStockCount,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "COMPLETED", ...dateQuery },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({ where: { ...dateQuery } }),
    prisma.customer.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      select: { stock: true, minStock: true },
    }).then((prods) => prods.filter((p) => p.minStock > 0 && p.stock <= p.minStock).length),
    prisma.product.count({ where: { isActive: true, stock: 0 } }),
  ]);

  return {
    period: params.period || "current_month",
    totalRevenue: revenueResult._sum.totalAmount || 0,
    totalOrders: orderCount,
    activeCustomers: customerCount,
    activeProducts: productCount,
    lowStockProductsCount: lowStockCount,
    outOfStockProductsCount: outOfStockCount,
    currency: "INR",
  };
}

/**
 * 2. getSalesSummary
 */
export async function getSalesSummary(
  params: { period?: string; startDate?: string; endDate?: string; compareWithPrevious?: boolean },
  ctx: ToolContext
) {
  const currentRange = parseDateRange(params.period, params.startDate, params.endDate);
  const dateQuery = currentRange.gte ? { createdAt: currentRange } : {};

  const [currentSales, currentOrders, currentOrderItems] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" }, ...dateQuery },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({
      where: { status: { not: "CANCELLED" }, ...dateQuery },
    }),
    prisma.orderItem.aggregate({
      where: { order: { status: { not: "CANCELLED" }, ...dateQuery } },
      _sum: { quantity: true },
    }),
  ]);

  const totalRevenue = currentSales._sum.totalAmount || 0;
  const orderCount = currentOrders || 0;
  const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
  const totalItemsSold = currentOrderItems._sum.quantity || 0;

  let comparison = null;
  if (params.compareWithPrevious && currentRange.gte && currentRange.lte) {
    const duration = currentRange.lte.getTime() - currentRange.gte.getTime();
    const prevEnd = new Date(currentRange.gte.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    const prevSales = await prisma.order.aggregate({
      where: {
        status: { not: "CANCELLED" },
        createdAt: { gte: prevStart, lte: prevEnd },
      },
      _sum: { totalAmount: true },
    });
    const prevRevenue = prevSales._sum.totalAmount || 0;
    const diff = totalRevenue - prevRevenue;
    const percentChange = prevRevenue > 0 ? (diff / prevRevenue) * 100 : 0;

    comparison = {
      previousRevenue: prevRevenue,
      difference: diff,
      percentageChange: Math.round(percentChange * 10) / 10,
    };
  }

  return {
    period: params.period || "custom",
    totalRevenue,
    orderCount,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    totalItemsSold,
    comparison,
    currency: "INR",
  };
}

/**
 * 3. getTopProducts
 */
export async function getTopProducts(
  params: { limit?: number; period?: string; startDate?: string; endDate?: string },
  ctx: ToolContext
) {
  const limit = Math.min(params.limit || 5, 20);
  const dateRange = parseDateRange(params.period, params.startDate, params.endDate);
  const dateFilter = dateRange.gte ? { createdAt: dateRange } : {};

  const topItems = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        status: { not: "CANCELLED" },
        ...dateFilter,
      },
    },
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const productIds = topItems.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: { select: { name: true } } },
  });

  const formatted = topItems.map((item, idx) => {
    const prod = products.find((p) => p.id === item.productId);
    return {
      rank: idx + 1,
      id: item.productId,
      name: prod?.name || "Unknown",
      sku: prod?.sku || "N/A",
      category: prod?.category?.name || "General",
      unitsSold: item._sum.quantity || 0,
      totalRevenue: Math.round((item._sum.total || 0) * 100) / 100,
      currentStock: prod?.stock ?? 0,
    };
  });

  return {
    period: params.period || "all_time",
    topProducts: formatted,
    count: formatted.length,
    currency: "INR",
  };
}

/**
 * 4. getLowStockProducts
 */
export async function getLowStockProducts(
  params: { limit?: number; categoryId?: string },
  ctx: ToolContext
) {
  const limit = Math.min(params.limit || 15, 50);
  const whereClause: any = { isActive: true };
  if (params.categoryId) whereClause.categoryId = params.categoryId;

  const products = await prisma.product.findMany({
    where: whereClause,
    include: { category: { select: { name: true } } },
    orderBy: { stock: "asc" },
  });

  const lowStock = products
    .filter((p) => p.stock <= p.minStock)
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || "General",
      currentStock: p.stock,
      minimumStock: p.minStock,
      status: p.stock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
      shortage: Math.max(0, p.minStock - p.stock),
      price: p.price,
    }));

  return {
    lowStockProducts: lowStock,
    totalLowStock: lowStock.length,
    criticalCount: lowStock.filter((p) => p.currentStock === 0).length,
  };
}

/**
 * 5. getRecentOrders
 */
export async function getRecentOrders(
  params: { limit?: number; status?: string },
  ctx: ToolContext
) {
  const limit = Math.min(params.limit || 5, 20);
  const whereClause: any = {};
  if (params.status) whereClause.status = params.status.toUpperCase();

  const orders = await prisma.order.findMany({
    where: whereClause,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      invoice: { select: { invoiceNo: true, status: true } },
      _count: { select: { items: true } },
    },
  });

  const formatted = orders.map((o) => ({
    id: o.id,
    customerName: o.customer.name,
    customerEmail: o.customer.email,
    totalAmount: o.totalAmount,
    status: o.status,
    invoiceStatus: o.invoice?.status || "UNPAID",
    invoiceNo: o.invoice?.invoiceNo || null,
    itemCount: o._count.items,
    orderDate: o.createdAt.toISOString().split("T")[0],
  }));

  return {
    orders: formatted,
    count: formatted.length,
    currency: "INR",
  };
}

/**
 * 6. getCustomerInsights
 */
export async function getCustomerInsights(
  params: { type?: "top_spending" | "frequent_buyers" | "inactive" | "all"; limit?: number },
  ctx: ToolContext
) {
  const limit = Math.min(params.limit || 5, 20);
  const type = params.type || "top_spending";

  const totalCustomerCount = await prisma.customer.count();

  if (type === "inactive") {
    // Customers with no orders in the last 60 days
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const inactiveCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { orders: { none: {} } },
          { orders: { every: { createdAt: { lt: sixtyDaysAgo } } } },
        ],
      },
      take: limit,
      include: {
        orders: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, totalAmount: true },
        },
      },
    });

    return {
      insightType: "inactive_customers",
      totalCustomers: totalCustomerCount,
      customers: inactiveCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        lastOrderDate: c.orders[0]?.createdAt ? c.orders[0].createdAt.toISOString().split("T")[0] : "Never",
        lastOrderAmount: c.orders[0]?.totalAmount || 0,
      })),
    };
  }

  // Top spending customers
  const customers = await prisma.customer.findMany({
    include: {
      orders: {
        where: { status: { not: "CANCELLED" } },
        select: { totalAmount: true, createdAt: true },
      },
    },
  });

  const ranked = customers
    .map((c) => {
      const totalSpent = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const lastOrder = c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalSpent: Math.round(totalSpent * 100) / 100,
        orderCount: c.orders.length,
        lastOrderDate: lastOrder ? lastOrder.createdAt.toISOString().split("T")[0] : "None",
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);

  return {
    insightType: "top_customers",
    totalCustomers: totalCustomerCount,
    customers: ranked,
    currency: "INR",
  };
}

/**
 * 7. getSupplierInsights (Admin/Manager only)
 */
export async function getSupplierInsights(
  params: { limit?: number },
  ctx: ToolContext
) {
  if (!requireRole(ctx.user, ["ADMIN", "MANAGER"])) {
    return {
      error: "Access Denied. Only ADMIN and MANAGER roles can view supplier procurement data.",
    };
  }

  const limit = Math.min(params.limit || 5, 20);

  const suppliers = await prisma.supplier.findMany({
    include: {
      purchases: {
        select: { totalAmount: true, status: true, createdAt: true },
      },
      _count: { select: { purchases: true } },
    },
  });

  const ranked = suppliers
    .map((s) => {
      const totalSpend = s.purchases.reduce((sum, p) => sum + p.totalAmount, 0);
      return {
        id: s.id,
        name: s.name,
        company: s.company || s.name,
        email: s.email,
        totalPurchases: s._count.purchases,
        totalSpend: Math.round(totalSpend * 100) / 100,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit);

  return {
    suppliers: ranked,
    totalSuppliers: suppliers.length,
    currency: "INR",
  };
}

/**
 * 8. getInvoiceSummary (Admin/Manager only)
 */
export async function getInvoiceSummary(params: {}, ctx: ToolContext) {
  if (!requireRole(ctx.user, ["ADMIN", "MANAGER"])) {
    return {
      error: "Access Denied. Only ADMIN and MANAGER roles can view finance and invoice data.",
    };
  }

  const [invoices, totalAggregate] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["status"],
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      _count: { id: true },
    }),
  ]);

  let paidTotal = 0;
  let paidCount = 0;
  let unpaidTotal = 0;
  let unpaidCount = 0;
  let partialTotal = 0;
  let partialCount = 0;

  invoices.forEach((inv) => {
    if (inv.status === "PAID") {
      paidTotal += inv._sum.total || 0;
      paidCount += inv._count.id;
    } else if (inv.status === "UNPAID") {
      unpaidTotal += inv._sum.total || 0;
      unpaidCount += inv._count.id;
    } else if (inv.status === "PARTIAL") {
      partialTotal += inv._sum.total || 0;
      partialCount += inv._count.id;
    }
  });

  const totalInvoiced = totalAggregate._sum.total || 0;
  const outstandingAmount = unpaidTotal + partialTotal;

  return {
    totalInvoices: totalAggregate._count.id,
    totalInvoicedAmount: Math.round(totalInvoiced * 100) / 100,
    paidInvoices: { count: paidCount, amount: Math.round(paidTotal * 100) / 100 },
    unpaidInvoices: { count: unpaidCount, amount: Math.round(unpaidTotal * 100) / 100 },
    partialInvoices: { count: partialCount, amount: Math.round(partialTotal * 100) / 100 },
    outstandingAmount: Math.round(outstandingAmount * 100) / 100,
    currency: "INR",
  };
}

/**
 * 9. getInventoryInsights
 */
export async function getInventoryInsights(params: {}, ctx: ToolContext) {
  const [products, recentMovements] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { stock: true, costPrice: true, price: true, minStock: true, name: true, sku: true },
    }),
    prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, sku: true } } },
    }),
  ]);

  let totalUnits = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach((p) => {
    totalUnits += p.stock;
    if (p.costPrice) totalCostValuation += p.stock * p.costPrice;
    totalRetailValuation += p.stock * p.price;
    if (p.stock === 0) outOfStockCount++;
    else if (p.stock <= p.minStock) lowStockCount++;
  });

  return {
    totalActiveProducts: products.length,
    totalStockUnits: totalUnits,
    estimatedCostValuation: Math.round(totalCostValuation * 100) / 100,
    estimatedRetailValuation: Math.round(totalRetailValuation * 100) / 100,
    lowStockAlerts: lowStockCount,
    outOfStockCount: outOfStockCount,
    recentMovements: recentMovements.map((m) => ({
      product: m.product.name,
      sku: m.product.sku,
      type: m.type,
      quantity: m.quantity,
      newStock: m.newStock,
      date: m.createdAt.toISOString().split("T")[0],
    })),
    currency: "INR",
  };
}

/**
 * Main Tool Dispatcher
 */
export async function executeTool(name: string, args: any, ctx: ToolContext): Promise<any> {
  try {
    switch (name) {
      case "getDashboardSummary":
        return await getDashboardSummary(args || {}, ctx);
      case "getSalesSummary":
        return await getSalesSummary(args || {}, ctx);
      case "getTopProducts":
        return await getTopProducts(args || {}, ctx);
      case "getLowStockProducts":
        return await getLowStockProducts(args || {}, ctx);
      case "getRecentOrders":
        return await getRecentOrders(args || {}, ctx);
      case "getCustomerInsights":
        return await getCustomerInsights(args || {}, ctx);
      case "getSupplierInsights":
        return await getSupplierInsights(args || {}, ctx);
      case "getInvoiceSummary":
        return await getInvoiceSummary(args || {}, ctx);
      case "getInventoryInsights":
        return await getInventoryInsights(args || {}, ctx);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error);
    return { error: error?.message || "Tool execution failed" };
  }
}
