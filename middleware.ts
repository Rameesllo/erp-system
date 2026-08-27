import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static files
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    // If already logged in and trying to access /login → redirect to dashboard
    if (pathname === "/login") {
      const token = request.cookies.get("erp_session")?.value;
      if (token) {
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
          await jwtVerify(token, secret);
          return NextResponse.redirect(new URL("/", request.url));
        } catch {
          // Token invalid — allow access to login
        }
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get("erp_session")?.value;
  const authHeader = request.headers.get("authorization");

  // Handle API route authorization (return JSON 401 instead of redirect)
  if (pathname.startsWith("/api/")) {
    if (authHeader?.startsWith("Bearer ")) {
      return NextResponse.next();
    }
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
  }

  // Handle Page route authorization (redirect to /login)
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("erp_session");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
