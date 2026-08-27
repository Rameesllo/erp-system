import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "erp_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export type SessionUser = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const decoded = jwt.verify(token, secret) as any;
    if (!decoded?.userId) return null;

    return {
      userId: String(decoded.userId),
      name: String(decoded.name),
      email: String(decoded.email),
      role: String(decoded.role),
    };
  } catch {
    return null;
  }
}

export function createSessionToken(user: {
  id: string;
  name: string;
  email: string;
  role: string;
}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");

  return jwt.sign(
    { userId: user.id, name: user.name, email: user.email, role: user.role },
    secret,
    { expiresIn: "1d" }
  );
}

export function getSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}
