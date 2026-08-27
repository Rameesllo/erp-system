import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export type AuthUser = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export function verifyToken(token: string): AuthUser | null {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET is not defined");

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
        name: String((decoded as any).name || ""),
        email: String(decoded.email),
        role: String(decoded.role),
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

export function requireRole(user: AuthUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

// Helper for API routes: reads cookie token
export function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)erp_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Helper: verify from request (checks both cookie and Authorization header)
export function verifyRequest(request: Request): AuthUser | null {
  // Try Authorization header first (for Bearer token compatibility)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) return user;
  }

  // Try cookie
  const cookieHeader = request.headers.get("cookie");
  const token = getTokenFromCookieHeader(cookieHeader);
  if (token) return verifyToken(token);

  return null;
}