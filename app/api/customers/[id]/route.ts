import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

// ==========================================
// GET - Get Customer By ID
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

    const customer = await prisma.customer.findUnique({
      where: {
        id,
      },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            payments: true,
            invoice: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
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

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);

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
// PUT - Update Customer
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

    if (!requireRole(user, ["ADMIN", "MANAGER", "STAFF"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();

    // Do not allow changing the customer ID
    if (body.id !== undefined && String(body.id) !== id) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer ID cannot be changed",
        },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      phone,
      address,
    } = body;

    const existingCustomer = await prisma.customer.findUnique({
      where: {
        id,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer not found",
        },
        { status: 404 }
      );
    }

    // Validate name if provided
    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer name cannot be empty",
        },
        { status: 400 }
      );
    }

    // Validate email and check duplicate if provided
    if (email !== undefined) {
      const trimmedEmail = String(email).trim();

      if (!trimmedEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "Customer email cannot be empty",
          },
          { status: 400 }
        );
      }

      if (!trimmedEmail.includes("@")) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid email address",
          },
          { status: 400 }
        );
      }

      const duplicateEmail = await prisma.customer.findFirst({
        where: {
          email: trimmedEmail,
          NOT: {
            id,
          },
        },
      });

      if (duplicateEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "Customer email already exists",
          },
          { status: 409 }
        );
      }
    }

    // Validate phone and check duplicate if provided
    if (phone !== undefined) {
      const trimmedPhone = String(phone).trim();

      if (!trimmedPhone) {
        return NextResponse.json(
          {
            success: false,
            message: "Customer phone cannot be empty",
          },
          { status: 400 }
        );
      }

      const duplicatePhone = await prisma.customer.findFirst({
        where: {
          phone: trimmedPhone,
          NOT: {
            id,
          },
        },
      });

      if (duplicatePhone) {
        return NextResponse.json(
          {
            success: false,
            message: "Customer phone already exists",
          },
          { status: 409 }
        );
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined && {
          name: String(name).trim(),
        }),

        ...(email !== undefined && {
          email: String(email).trim(),
        }),

        ...(phone !== undefined && {
          phone: String(phone).trim(),
        }),

        ...(address !== undefined && {
          address:
            address === null || String(address).trim() === ""
              ? null
              : String(address).trim(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

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
// DELETE - Delete Customer
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

    const customer = await prisma.customer.findUnique({
      where: {
        id,
      },
      include: {
        orders: true,
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

    // Don't delete customer if existing orders depend on that customer
    if (customer.orders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete customer because existing orders depend on this customer",
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}