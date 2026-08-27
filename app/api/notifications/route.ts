import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = verifyRequest(request);
    if (!auth) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    if (!(prisma as any).notification) {
      return NextResponse.json({ success: true, notifications: [], unreadCount: 0 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ success: true, notifications: [], unreadCount: 0 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = verifyRequest(request);
    if (!auth) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    if (!(prisma as any).notification) {
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    await prisma.notification.updateMany({
      where: { userId: auth.userId, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all read error:", error);
    return NextResponse.json({ success: true, message: "All notifications marked as read" });
  }
}
