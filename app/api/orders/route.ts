import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

// ==========================================
// POST - Create Order
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

    if (!requireRole(user, ["ADMIN", "MANAGER", "STAFF"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { customerId, items } = body;

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer ID is required",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one order item is required",
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer not found",
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

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Quantity must be a positive integer",
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

      if (product.stock < quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `Insufficient stock for ${product.name}. Available stock: ${product.stock}, requested: ${quantity}`,
          },
          { status: 400 }
        );
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;

      const newOrder = await tx.order.create({
        data: {
          customerId,
          totalAmount: 0,
          status: "PENDING",
        },
      });

      for (const item of items) {
        const quantity = Number(item.quantity);

        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.stock < quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const unitPrice = product.price;
        const total = quantity * unitPrice;
        totalAmount += total;

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: product.id,
            quantity,
            unitPrice,
            total,
          },
        });

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            stock: {
              decrement: quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "OUT",
            quantity,
            previousStock: product.stock,
            newStock: product.stock - quantity,
            reason: `Order ${newOrder.id}`,
          },
        });
      }

      await tx.order.update({
        where: {
          id: newOrder.id,
        },
        data: {
          totalAmount,
        },
      });

      return tx.order.findUnique({
        where: {
          id: newOrder.id,
        },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          payments: true,
          invoice: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order created successfully",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create order error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// GET - Get All Orders
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

    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: true,
        invoice: true,
      },
    });

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}