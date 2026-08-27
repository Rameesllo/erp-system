import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

// ==========================================
// GET - Get Purchase By ID
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

    const purchase = await prisma.purchase.findUnique({
      where: {
        id,
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

    if (!purchase) {
      return NextResponse.json(
        {
          success: false,
          message: "Purchase not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error) {
    console.error("Get purchase error:", error);

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
// PUT - Update Purchase Status
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
          message: "Purchase status is required",
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

    const purchase = await prisma.purchase.findUnique({
      where: {
        id,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        {
          success: false,
          message: "Purchase not found",
        },
        { status: 404 }
      );
    }

    // Don't allow changing a cancelled purchase
    if (purchase.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: "Cancelled purchase cannot be updated",
        },
        { status: 400 }
      );
    }

    // Don't allow changing a completed purchase
    // because stock has already been added.
    if (
      purchase.status === "COMPLETED" &&
      status !== "COMPLETED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Completed purchase cannot be changed because stock has already been added",
        },
        { status: 400 }
      );
    }

    const updatedPurchase = await prisma.purchase.update({
      where: {
        id,
      },
      data: {
        status,
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Purchase status updated successfully",
      purchase: updatedPurchase,
    });
  } catch (error) {
    console.error("Update purchase error:", error);

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
// DELETE - Delete Purchase
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

    const purchase = await prisma.purchase.findUnique({
      where: {
        id,
      },
      include: {
        items: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        {
          success: false,
          message: "Purchase not found",
        },
        { status: 404 }
      );
    }

    if (purchase.status === "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Completed purchase cannot be deleted because stock has already been added. Cancel or reverse the stock transaction instead.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({
        where: {
          purchaseId: id,
        },
      });

      await tx.purchase.delete({
        where: {
          id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Purchase deleted successfully",
    });
  } catch (error) {
    console.error("Delete purchase error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}