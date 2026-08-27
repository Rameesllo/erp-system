import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

function generateInvoiceNo() {
  const now = Date.now();
  const rnd = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${now}-${rnd}`;
}

// POST - Create Invoice
export async function POST(request: Request) {
  try {
    const user = verifyRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!requireRole(user, ["ADMIN", "MANAGER", "STAFF"])) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderId, tax = 0, discount = 0 } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order ID is required" },
        { status: 400 }
      );
    }

    const taxNum = Number(tax ?? 0);
    const discountNum = Number(discount ?? 0);

    if (!Number.isFinite(taxNum) || taxNum < 0) {
      return NextResponse.json(
        { success: false, message: "Tax cannot be negative" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(discountNum) || discountNum < 0) {
      return NextResponse.json(
        { success: false, message: "Discount cannot be negative" },
        { status: 400 }
      );
    }

    // load order with items and payments and customer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Check invoice already exists for order
    const existing = await prisma.invoice.findUnique({
      where: { orderId: orderId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Invoice already exists for this order" },
        { status: 409 }
      );
    }

    // calculate subtotal from order items
    const subtotal = order.items.reduce((s, it) => {
      const qty = Number((it as any).quantity ?? 0);
      const unit = Number((it as any).unitPrice ?? 0);
      return s + qty * unit;
    }, 0);

    const invoiceBase = subtotal + taxNum;

    if (discountNum > invoiceBase) {
      return NextResponse.json(
        { success: false, message: "Discount cannot exceed invoice amount" },
        { status: 400 }
      );
    }

    const total = subtotal + taxNum - discountNum;

    // determine payment status
    const paid = order.payments
      .filter((p) => (p as any).status === "COMPLETED")
      .reduce((t, p) => t + Number((p as any).amount ?? 0), 0);

    let status = "UNPAID";
    if (paid <= 0) status = "UNPAID";
    else if (paid >= order.totalAmount) status = "PAID";
    else status = "PARTIAL";

    // generate unique invoiceNo (ensure uniqueness)
    let invoiceNo = generateInvoiceNo();
    let attempts = 0;
    while (attempts < 5) {
      const found = await prisma.invoice.findUnique({
        where: { invoiceNo },
      });
      if (!found) break;
      invoiceNo = generateInvoiceNo();
      attempts++;
    }

    // create invoice
    const created = await prisma.invoice.create({
      data: {
        invoiceNo,
        orderId: order.id,
        subtotal,
        tax: taxNum,
        discount: discountNum,
        total,
        status,
      },
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: {
                product: true,
              },
            },
            payments: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, message: "Invoice created successfully", invoice: created },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 }
    );
  }
}

// GET - Get all invoices
export async function GET(request: Request) {
  try {
    const user = verifyRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: {
                product: true,
              },
            },
            payments: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
