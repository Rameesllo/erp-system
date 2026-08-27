import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, verifyRequest } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = verifyRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
    }

    if (!requireRole(user, ["ADMIN", "MANAGER"])) {
      return NextResponse.json({ success: false, message: "Access denied. Admin or Manager only." }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Category name is required" }, { status: 400 });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      return NextResponse.json({ success: false, message: "Category already exists" }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, message: "Category created successfully", category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = verifyRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}