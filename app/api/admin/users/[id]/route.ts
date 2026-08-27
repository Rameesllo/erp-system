import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = verifyRequest(request);
    if (!auth || !requireRole(auth, ["ADMIN"])) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin only." }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, isActive } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Safety checks for admin modifications
    if (existingUser.role === "ADMIN") {
      // If we are trying to deactivate or downgrade an admin, we must ensure there's at least one other active admin
      if (
        (isActive !== undefined && isActive === false && existingUser.isActive === true) || 
        (role !== undefined && role !== "ADMIN")
      ) {
        const otherActiveAdmins = await prisma.user.count({
          where: {
            role: "ADMIN",
            isActive: true,
            id: { not: id }
          }
        });
        
        if (otherActiveAdmins === 0) {
          return NextResponse.json({ 
            success: false, 
            message: "Cannot deactivate or downgrade the last active admin." 
          }, { status: 400 });
        }
      }
    }

    // Email duplication check
    if (email && email.trim().toLowerCase() !== existingUser.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (duplicate) {
        return NextResponse.json({ success: false, message: "Email already in use" }, { status: 409 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        email: email ? email.trim().toLowerCase() : undefined,
        role: role || undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
    });

    return NextResponse.json({ success: true, message: "User updated", user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}
