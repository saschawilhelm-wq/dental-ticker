import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/config/auth";

/**
 * Vorprüfung: Ohne Sitzungs-Cookie direkt zur Anmeldung. Die eigentliche
 * Prüfung (gültige Sitzung, Admin-Rolle) passiert in `requireAdmin()`.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(authConfig.sessionCookieName)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
