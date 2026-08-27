import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, verifyRequest } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = verifyRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
    }

    if (!requireRole(user, ["ADMIN", "MANAGER"])) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
    }

    if (name && name.trim() !== existingCategory.name) {
      const duplicateName = await prisma.category.findUnique({
        where: { name: name.trim() },
      });
      if (duplicateName) {
        return NextResponse.json({ success: false, message: "Category name already exists" }, { status: 409 });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? (description?.trim() || null) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json({ success: true, message: "Category updated successfully", category });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = verifyRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
    }

    if (!requireRole(user, ["ADMIN", "MANAGER"])) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { success: false, message: "Cannot delete category with existing products. Deactivate it instead." },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}