import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest } from "@/lib/auth";

// GET - Get all payments
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

    const payments = await prisma.payment.findMany({
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}

// POST - Create payment
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

    const body = await request.json();

    const {
      orderId,
      amount,
      method,
      transactionId,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID is required",
        },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment amount is required",
        },
        { status: 400 }
      );
    }

    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment amount must be greater than 0",
        },
        { status: 400 }
      );
    }

    if (!method || !method.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment method is required",
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        payments: true,
        customer: true,
        invoice: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot make payment for a cancelled order",
        },
        { status: 400 }
      );
    }

    const alreadyPaid = order.payments
      .filter((payment) => payment.status === "COMPLETED")
      .reduce((total, payment) => total + payment.amount, 0);

    const paymentTotal = order.invoice
      ? Number(order.invoice.total)
      : Number(order.totalAmount);

    const remainingAmount = paymentTotal - alreadyPaid; 

    if (paymentAmount > remainingAmount) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment amount exceeds remaining invoice amount",
          invoiceTotal: paymentTotal,
          orderTotal: order.totalAmount,
          alreadyPaid,
          remainingAmount,
        },
        { status: 400 }
      );
    }

    if (transactionId) {
      const existingPayment = await prisma.payment.findUnique({
        where: {
          transactionId: transactionId.trim(),
        },
      });

      if (existingPayment) {
        return NextResponse.json(
          {
            success: false,
            message: "Transaction ID already exists",
          },
          { status: 409 }
        );
      }
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: paymentAmount,
        method: method.trim(),
        status: "COMPLETED",
        transactionId: transactionId?.trim() || null,
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    const totalPaid = alreadyPaid + paymentAmount;
   
    if (order.invoice) {
      const invoiceStatus =
        totalPaid >= paymentTotal
          ? "PAID"
          : totalPaid > 0
          ? "PARTIAL"
          : "UNPAID";

      await prisma.invoice.update({
        where: {
          id: order.invoice.id,
        },
        data: {
          status: invoiceStatus,
        },
      });
    }

    if (totalPaid >= paymentTotal) {
      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: "COMPLETED",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment created successfully",
        payment,
        order: {
          id: orderId,
          totalAmount: order.totalAmount,
          alreadyPaid,
          paidNow: paymentAmount,
          totalPaid,
          remainingAmount: paymentTotal - totalPaid,
          status:
            totalPaid >= paymentTotal
              ? "COMPLETED"
              : order.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create payment error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}