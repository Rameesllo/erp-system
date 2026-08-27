import { NextResponse } from "next/server";
import { verifyRequest, requireRole } from "@/lib/auth";

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

    if (!requireRole(user, ["ADMIN"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Admin only.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Welcome Admin!",
      user,
    });
  } catch (error) {
    console.error("Admin API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}
