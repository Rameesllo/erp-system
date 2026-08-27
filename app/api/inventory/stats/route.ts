import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyRequest(request);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const totalProducts = await prisma.product.count({
      where: { isActive: true }
    });

    const activeProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: { stock: true, minStock: true }
    });

    let totalItems = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    activeProducts.forEach((p) => {
      totalItems += p.stock;
      if (p.stock <= 0) {
        outOfStockCount++;
      } else if (p.stock <= p.minStock) {
        lowStockCount++;
      }
    });

    // Calculate this week's movements
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentMovements = await prisma.stockMovement.findMany({
      where: { createdAt: { gte: oneWeekAgo } },
      select: { type: true, quantity: true }
    });

    let stockIn = 0;
    let stockOut = 0;

    recentMovements.forEach((m) => {
      if (m.type === "IN") stockIn += m.quantity;
      if (m.type === "OUT") stockOut += m.quantity;
    });

    const needsAttention = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: { id: true, name: true, sku: true, stock: true, minStock: true },
    });
    
    // Filter since stock <= minStock
    const filteredNeedsAttention = needsAttention.filter(p => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock).slice(0, 10);

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        totalItems,
        lowStockCount,
        outOfStockCount,
        stockIn,
        stockOut,
        needsAttention: filteredNeedsAttention
      }
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}
