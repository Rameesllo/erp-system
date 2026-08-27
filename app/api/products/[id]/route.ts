import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, verifyRequest } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = verifyRequest(request);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true }
    });

    if (!product) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = verifyRequest(request);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!requireRole(user, ["ADMIN", "MANAGER", "STAFF"])) return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });

    const body = await request.json();
    const { name, sku, description, price, costPrice, minStock, isActive, categoryId, imageUrl } = body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

    if (sku && sku.trim() !== existing.sku) {
      const duplicate = await prisma.product.findUnique({ where: { sku: sku.trim() } });
      if (duplicate) return NextResponse.json({ success: false, message: "SKU already exists" }, { status: 409 });
    }

    if (categoryId && categoryId !== existing.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        sku: sku ? sku.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        price: price !== undefined ? Number(price) : undefined,
        costPrice: costPrice !== undefined ? (costPrice === null ? null : Number(costPrice)) : undefined,
        minStock: minStock !== undefined ? Number(minStock) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        categoryId: categoryId || undefined,
        imageUrl: imageUrl !== undefined ? (imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : null) : undefined,
      },
      include: { category: true }
    });

    return NextResponse.json({ success: true, message: "Product updated", product });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = verifyRequest(request);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!requireRole(user, ["ADMIN", "MANAGER"])) return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stockMovements: true, purchaseItems: true, orderItems: true }
        }
      }
    });

    if (!product) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

    const hasRelations = product._count.stockMovements > 0 || product._count.purchaseItems > 0 || product._count.orderItems > 0;

    if (hasRelations) {
      // Soft delete
      await prisma.product.update({
        where: { id },
        data: { isActive: false }
      });
      return NextResponse.json({ success: true, message: "Product has related records. Soft-deleted instead." });
    }

    // Hard delete
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}