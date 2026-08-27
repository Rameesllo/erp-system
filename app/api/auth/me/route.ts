import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = verifyRequest(request);

    if (!auth || !auth.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
      });

      if (user) {
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: (user as any).isActive ?? true,
          },
        });
      }
    } catch (dbErr) {
      console.error("DB error in /api/auth/me:", dbErr);
    }

    // Fallback to verified token session payload
    return NextResponse.json({
      success: true,
      user: {
        id: auth.userId,
        name: auth.name,
        email: auth.email,
        role: auth.role,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = verifyRequest(request);

    if (!auth || !auth.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}