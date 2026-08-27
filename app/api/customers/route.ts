import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

// ==========================================
// POST - Create Customer
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

    const {
      name,
      email,
      phone,
      address,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer name is required",
        },
        { status: 400 }
      );
    }

    if (!email || !String(email).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer email is required",
        },
        { status: 400 }
      );
    }

    const trimmedEmail = String(email).trim();

    if (!trimmedEmail.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email address",
        },
        { status: 400 }
      );
    }

    const existingEmailCustomer = await prisma.customer.findUnique({
      where: {
        email: trimmedEmail,
      },
    });

    if (existingEmailCustomer) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer email already exists",
        },
        { status: 409 }
      );
    }

    if (!phone || !String(phone).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer phone is required",
        },
        { status: 400 }
      );
    }

    const trimmedPhone = String(phone).trim();

    const existingPhoneCustomer = await prisma.customer.findFirst({
      where: {
        phone: trimmedPhone,
      },
    });

    if (existingPhoneCustomer) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer phone already exists",
        },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name: String(name).trim(),
        email: trimmedEmail,
        phone: trimmedPhone,
        address:
          address !== undefined &&
          address !== null &&
          String(address).trim() !== ""
            ? String(address).trim()
            : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Customer created successfully",
        customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create customer error:", error);

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
// GET - Get All Customers
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

    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        orders: true,
      },
    });

    return NextResponse.json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}