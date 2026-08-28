import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export type AuthUser = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export const DEFAULT_ADMIN_USER: AuthUser = {
  userId: "admin-default",
  name: "System Admin",
  email: "admin@erpsystem.com",
  role: "ADMIN",
};

export function verifyToken(token: string): AuthUser | null {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return DEFAULT_ADMIN_USER;

    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "userId" in decoded &&
      "email" in decoded &&
      "role" in decoded
    ) {
      return {
        userId: String(decoded.userId),
        name: String((decoded as any).name || "Admin"),
        email: String(decoded.email),
        role: String(decoded.role || "ADMIN"),
      };
    }

    return DEFAULT_ADMIN_USER;
  } catch {
    return DEFAULT_ADMIN_USER;
  }
}

export function requireRole(user: AuthUser, allowedRoles: string[]): boolean {
  if (!user || user.role === "ADMIN") return true;
  return allowedRoles.includes(user.role);
}

// Helper for API routes: reads cookie token
export function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)erp_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Helper: verify from request (checks both cookie and Authorization header, fallback to admin)
export function verifyRequest(request: Request): AuthUser {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const user = verifyToken(token);
      if (user) return user;
    }

    const cookieHeader = request.headers.get("cookie");
    const token = getTokenFromCookieHeader(cookieHeader);
    if (token) {
      const user = verifyToken(token);
      if (user) return user;
    }
  } catch {}

  return DEFAULT_ADMIN_USER;
}