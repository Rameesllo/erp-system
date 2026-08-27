import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, verifyRequest } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = verifyRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
    }

    if (!requireRole(user, ["ADMIN", "MANAGER", "STAFF"])) {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, sku, description, price, costPrice, stock, minStock, isActive, categoryId, imageUrl } = body;

    if (!name || !String(name).trim()) return NextResponse.json({ success: false, message: "Product name is required" }, { status: 400 });
    if (!sku || !String(sku).trim()) return NextResponse.json({ success: false, message: "SKU is required" }, { status: 400 });
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return NextResponse.json({ success: false, message: "Price must be a positive number" }, { status: 400 });
    }
    if (costPrice !== undefined && costPrice !== null && (isNaN(Number(costPrice)) || Number(costPrice) < 0)) {
      return NextResponse.json({ success: false, message: "Cost price must be a non-negative number" }, { status: 400 });
    }
    if (stock !== undefined && stock !== null && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
      return NextResponse.json({ success: false, message: "Stock must be a non-negative integer" }, { status: 400 });
    }
    if (minStock !== undefined && minStock !== null && (!Number.isInteger(Number(minStock)) || Number(minStock) < 0)) {
      return NextResponse.json({ success: false, message: "Minimum stock must be a non-negative integer" }, { status: 400 });
    }
    if (!categoryId) return NextResponse.json({ success: false, message: "Category ID is required" }, { status: 400 });

    const existingProduct = await prisma.product.findUnique({
      where: { sku: String(sku).trim() },
    });

    if (existingProduct) {
      return NextResponse.json({ success: false, message: "Product SKU already exists" }, { status: 409 });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
    }

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        sku: String(sku).trim(),
        description: description?.trim() || null,
        price: Number(price),
        costPrice: costPrice !== undefined && costPrice !== null ? Number(costPrice) : null,
        stock: stock !== undefined && stock !== null ? Number(stock) : 0,
        minStock: minStock !== undefined && minStock !== null ? Number(minStock) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        categoryId,
        imageUrl: imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, message: "Product created successfully", product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = verifyRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let whereClause = {};
    if (search) {
      whereClause = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ]
      };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}