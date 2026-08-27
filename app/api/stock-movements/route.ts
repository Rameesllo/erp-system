import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, verifyRequest } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = verifyRequest(request);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!requireRole(user, ["ADMIN", "MANAGER", "STAFF"])) return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });

    const body = await request.json();
    const { productId, type, quantity, reason, reference, notes } = body;

    if (!productId) return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    if (!type || !["IN", "OUT", "ADJUSTMENT"].includes(type)) return NextResponse.json({ success: false, message: "Valid movement type (IN, OUT, ADJUSTMENT) is required" }, { status: 400 });
    
    // For IN/OUT quantity must be positive. For ADJUSTMENT, quantity is the exact new stock level in the request (which can be 0).
    if (type !== "ADJUSTMENT" && (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0)) {
      return NextResponse.json({ success: false, message: "Quantity must be a positive integer" }, { status: 400 });
    }
    if (type === "ADJUSTMENT" && (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)) {
      return NextResponse.json({ success: false, message: "Adjustment quantity must be a non-negative integer" }, { status: 400 });
    }
    if (type === "ADJUSTMENT" && !reason?.trim()) {
      return NextResponse.json({ success: false, message: "Reason is required for manual adjustments" }, { status: 400 });
    }

    const qty = Number(quantity);

    // Use a Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error("Product not found");

      let previousStock = product.stock;
      let newStock = previousStock;
      let actualQuantityToRecord = qty;

      if (type === "IN") {
        newStock = previousStock + qty;
      } else if (type === "OUT") {
        if (previousStock < qty) throw new Error("Insufficient stock");
        newStock = previousStock - qty;
      } else if (type === "ADJUSTMENT") {
        newStock = qty; // For adjustment, qty passed is the actual new physical count
        actualQuantityToRecord = newStock - previousStock; // Delta
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity: actualQuantityToRecord,
          previousStock,
          newStock,
          reason: reason?.trim() || null,
          reference: reference?.trim() || null,
          notes: notes?.trim() || null,
        }
      });

      await tx.product.update({
        where: { id: productId },
        data: { stock: newStock }
      });

      return movement;
    });

    return NextResponse.json({ success: true, message: "Stock updated successfully", movement: result }, { status: 201 });
  } catch (error: any) {
    console.error("Stock movement error:", error);
    if (error.message === "Insufficient stock") {
      return NextResponse.json({ success: false, message: "Requested quantity exceeds available stock" }, { status: 400 });
    }
    if (error.message === "Product not found") {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = verifyRequest(request);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        product: { select: { name: true, sku: true } }
      }
    });

    return NextResponse.json({ success: true, movements });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}