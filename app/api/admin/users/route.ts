import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyRequest, requireRole } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = verifyRequest(request);
    if (!auth || !requireRole(auth, ["ADMIN"])) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin only." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    const safeUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: (u as any).isActive ?? true,
      createdAt: u.createdAt,
      lastLoginAt: (u as any).lastLoginAt ?? null,
    }));

    return NextResponse.json({ success: true, users: safeUsers });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = verifyRequest(request);
    if (!auth || !requireRole(auth, ["ADMIN"])) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin only." }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ success: false, message: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, message: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ success: false, message: "Email already in use" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
      },
    });

    return NextResponse.json({
      success: true,
      message: "User created",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: (user as any).isActive ?? true,
        createdAt: user.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}
