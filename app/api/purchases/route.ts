import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

// ==========================================
// POST - Create Purchase
// ==========================================

export async function POST(request: Request) {
  try {
    const user = verifyRequest(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    if (!requireRole(user, ["ADMIN", "MANAGER"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Admin or Manager only.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      supplierId,
      items,
    } = body;

    if (!supplierId) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier ID is required",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one purchase item is required",
        },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier not found",
        },
        { status: 404 }
      );
    }

    for (const item of items) {
      if (!item.productId) {
        return NextResponse.json(
          {
            success: false,
            message: "Product ID is required for every item",
          },
          { status: 400 }
        );
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Quantity must be a positive integer",
          },
          { status: 400 }
        );
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Unit price must be a valid non-negative number",
          },
          { status: 400 }
        );
      }

      const product = await prisma.product.findUnique({
        where: {
          id: item.productId,
        },
      });

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: `Product not found: ${item.productId}`,
          },
          { status: 404 }
        );
      }
    }

    let totalAmount = 0;

    for (const item of items) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      totalAmount += quantity * unitPrice;
    }

    const purchase = await prisma.$transaction(async (tx) => {
      const newPurchase = await tx.purchase.create({
        data: {
          supplierId,
          totalAmount,
          status: "COMPLETED",
        },
      });

      for (const item of items) {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const total = quantity * unitPrice;

        await tx.purchaseItem.create({
          data: {
            purchaseId: newPurchase.id,
            productId: item.productId,
            quantity,
            unitPrice,
            total,
          },
        });

        const updatedProduct = await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              increment: quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "IN",
            quantity,
            previousStock: updatedProduct.stock - quantity,
            newStock: updatedProduct.stock,
            reason: `Purchase ${newPurchase.id}`,
          },
        });
      }

      return tx.purchase.findUnique({
        where: {
          id: newPurchase.id,
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Purchase created successfully",
        purchase,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create purchase error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// GET - Get All Purchases
// ==========================================

export async function GET(request: Request) {
  try {
    const user = verifyRequest(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const purchases = await prisma.purchase.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      purchases,
    });
  } catch (error) {
    console.error("Get purchases error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}