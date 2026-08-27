import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

// ==========================================
// GET - Get Supplier By ID
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

    const supplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
      include: {
        purchases: true,
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

    return NextResponse.json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error("Get supplier error:", error);

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
// PUT - Update Supplier
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

    const {
      name,
      email,
      phone,
      address,
      company,
    } = body;

    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier not found",
        },
        { status: 404 }
      );
    }

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier name cannot be empty",
        },
        { status: 400 }
      );
    }

    // Check duplicate email
    if (
      email !== undefined &&
      email !== null &&
      String(email).trim() !== ""
    ) {
      const duplicateEmail = await prisma.supplier.findFirst({
        where: {
          email: String(email).trim(),
          NOT: {
            id,
          },
        },
      });

      if (duplicateEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "Supplier email already exists",
          },
          { status: 409 }
        );
      }
    }

    const updatedSupplier = await prisma.supplier.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined && {
          name: String(name).trim(),
        }),

        ...(email !== undefined && {
          email:
            email === null || String(email).trim() === ""
              ? null
              : String(email).trim(),
        }),

        ...(phone !== undefined && {
          phone:
            phone === null || String(phone).trim() === ""
              ? null
              : String(phone).trim(),
        }),

        ...(address !== undefined && {
          address:
            address === null || String(address).trim() === ""
              ? null
              : String(address).trim(),
        }),

        ...(company !== undefined && {
          company:
            company === null || String(company).trim() === ""
              ? null
              : String(company).trim(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Supplier updated successfully",
      supplier: updatedSupplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);

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
// DELETE - Delete Supplier
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

    const supplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
      include: {
        purchases: true,
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

    // Don't delete supplier if purchases exist
    if (supplier.purchases.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cannot delete supplier because they have existing purchases",
        },
        { status: 400 }
      );
    }

    await prisma.supplier.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}
