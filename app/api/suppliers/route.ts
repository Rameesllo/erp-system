import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

// ==========================================
// POST - Create Supplier
// ==========================================

export async function POST(request: Request) {
  try {
    const user = verifyRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
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
      name,
      email,
      phone,
      address,
      company,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier name is required",
        },
        { status: 400 }
      );
    }

    if (email && String(email).trim()) {
      const existingSupplier = await prisma.supplier.findUnique({
        where: {
          email: String(email).trim(),
        },
      });

      if (existingSupplier) {
        return NextResponse.json(
          {
            success: false,
            message: "Supplier email already exists",
          },
          { status: 409 }
        );
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: String(name).trim(),
        email:
          email && String(email).trim()
            ? String(email).trim()
            : null,
        phone:
          phone && String(phone).trim()
            ? String(phone).trim()
            : null,
        address:
          address && String(address).trim()
            ? String(address).trim()
            : null,
        company:
          company && String(company).trim()
            ? String(company).trim()
            : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Supplier created successfully",
        supplier,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create supplier error:", error);

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
// GET - Get All Suppliers
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

    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      suppliers,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}