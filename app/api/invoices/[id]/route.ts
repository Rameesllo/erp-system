import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

// GET - Get invoice by id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: { product: true },
            },
            payments: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("Get invoice error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}

// PUT - Update invoice (tax, discount)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { tax, discount } = body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: { items: true, payments: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 }
      );
    }

    const taxNum = tax === undefined ? invoice.tax : Number(tax);
    const discountNum = discount === undefined ? invoice.discount : Number(discount);

    if (!Number.isFinite(taxNum) || taxNum < 0) {
      return NextResponse.json({ success: false, message: "Tax cannot be negative" }, { status: 400 });
    }

    if (!Number.isFinite(discountNum) || discountNum < 0) {
      return NextResponse.json({ success: false, message: "Discount cannot be negative" }, { status: 400 });
    }

    // recalc subtotal from order items
    const subtotal = invoice.order.items.reduce((s, it) => {
      const qty = Number((it as any).quantity ?? 0);
      const unit = Number((it as any).unitPrice ?? 0);
      return s + qty * unit;
    }, 0);

    const invoiceBase = subtotal + taxNum;

    if (discountNum > invoiceBase) {
      return NextResponse.json({ success: false, message: "Discount cannot exceed invoice amount" }, { status: 400 });
    }

    const total = subtotal + taxNum - discountNum;

    // determine payment status from order payments
    const paid = invoice.order.payments
      .filter((p) => (p as any).status === "COMPLETED")
      .reduce((t, p) => t + Number((p as any).amount ?? 0), 0);

    let status = "UNPAID";
    if (paid <= 0) status = "UNPAID";
    else if (paid >= invoice.order.totalAmount) status = "PAID";
    else status = "PARTIAL";

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        tax: taxNum,
        discount: discountNum,
        total,
        status,
      },
      include: {
        order: {
          include: {
            customer: true,
            items: { include: { product: true } },
            payments: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, message: "Invoice updated", invoice: updated });
  } catch (error) {
    console.error("Update invoice error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

// DELETE - Delete invoice
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    await prisma.invoice.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Invoice deleted" });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}
