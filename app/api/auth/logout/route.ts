import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  const cookieOpts = getSessionCookieOptions();
  response.cookies.set(cookieOpts.name, "", {
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    maxAge: 0,
    path: cookieOpts.path,
  });
  return response;
}
