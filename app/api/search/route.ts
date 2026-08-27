import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const tokenUser = session ? null : verifyRequest(request);
    if (!session?.userId && !tokenUser?.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, results: { products: [], customers: [], orders: [], suppliers: [], invoices: [] } });
    }

    const [products, customers, orders, suppliers, invoices] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, sku: true, stock: true, price: true },
        take: 5,
      }),
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, phone: true },
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: { id: true, totalAmount: true, status: true, createdAt: true, customer: { select: { name: true } } },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.supplier.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, company: true, email: true },
        take: 5,
      }),
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNo: { contains: q, mode: "insensitive" } },
            { order: { customer: { name: { contains: q, mode: "insensitive" } } } },
          ],
        },
        select: { id: true, invoiceNo: true, total: true, status: true, order: { select: { customer: { select: { name: true } } } } },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ success: true, results: { products, customers, orders, suppliers, invoices } });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}
