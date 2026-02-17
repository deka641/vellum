import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/sites") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/settings");

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/sites", req.nextUrl));
  }

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|s/).*)",
  ],
};
