import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

// ==========================================
// GET - Get Order By ID
// ==========================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: {
        id,
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

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order error:", error);

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
// PUT - Update Order Status
// ==========================================

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          message: "Order status is required",
        },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "PENDING",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid status. Use PENDING, COMPLETED, or CANCELLED.",
        },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        items: {
          include: {
            product: true,
          }
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    // Don't modify an already cancelled order
    if (existingOrder.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: "Cancelled order cannot be updated",
        },
        { status: 400 }
      );
    }

    // Don't allow COMPLETED -> PENDING
    if (
      existingOrder.status === "COMPLETED" &&
      status === "PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Completed order cannot be changed back to pending",
        },
        { status: 400 }
      );
    }

    // Don't allow COMPLETED -> CANCELLED
    if (
      existingOrder.status === "COMPLETED" &&
      status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Completed order cannot be cancelled. Process a manual refund if required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // CANCEL ORDER - Restore stock
    // ==========================================

    if (
      existingOrder.status !== "CANCELLED" &&
      status === "CANCELLED"
    ) {
      const updatedOrder = await prisma.$transaction(
        async (tx) => {
          for (const item of existingOrder.items) {
            await tx.product.update({
              where: {
                id: item.productId,
              },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: "IN",
                quantity: item.quantity,
                previousStock: item.product.stock,
                newStock: item.product.stock + item.quantity,
                reason: `Order ${id} cancelled`,
              },
            });
          }

          return tx.order.update({
            where: {
              id,
            },
            data: {
              status: "CANCELLED",
            },
            include: {
              customer: true,
              items: {
                include: {
                  product: true,
                },
              },
              payments: true,
              invoice: true,
            },
          });
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Order cancelled successfully and stock restored",
        order: updatedOrder,
      });
    }

    // ==========================================
    // Normal status update
    // ==========================================

    const updatedOrder = await prisma.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        invoice: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order error:", error);

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
// DELETE - Delete Order
// ==========================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!requireRole(user, ["ADMIN"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Admin only.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        items: true,
        payments: true,
        invoice: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    if (order.status === "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Completed order cannot be deleted. Cancel the order first to restore stock.",
        },
        { status: 400 }
      );
    }

    if (order.payments.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order with payment records cannot be deleted",
        },
        { status: 400 }
      );
    }

    if (order.invoice) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order with an invoice cannot be deleted",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: {
          orderId: id,
        },
      });

      await tx.order.delete({
        where: {
          id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Delete order error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}