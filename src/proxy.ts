import { NextRequest, NextResponse } from "next/server";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";
const MAIN_HOST = `www.${BASE_DOMAIN}`;
const MAINTENANCE_MODE = (process.env.MAINTENANCE_MODE || "false").toLowerCase() === "true";

const RESERVED_SUBDOMAINS = new Set([
  "console",
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "support",
  "help",
  "blog",
  "login",
  "",
]);

// System paths that should NEVER be rewritten on subdomains.
// If hit on a subdomain, redirect to www instead.
const SYSTEM_PATHS = [
  "/console",
  "/login",
  "/signup",
  "/onboarding",
  "/admin",
  "/auth",
  "/howto",
  "/eula",
  "/privacy",
  "/terms",
  "/builder",
  "/playground",
  "/studio",
  "/purchase-success",
  "/maintenance",
];

function isBypassedPath(pathname: string): boolean {
  if (pathname === "/maintenance") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  return false;
}

function isSystemPath(pathname: string): boolean {
  return SYSTEM_PATHS.some(
    (sp) => pathname === sp || pathname.startsWith(`${sp}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (MAINTENANCE_MODE && !isBypassedPath(pathname)) {
    return NextResponse.rewrite(new URL("/maintenance", request.url));
  }

  const hostname = request.headers.get("host") || "";
  const hostnameWithoutPort = hostname.split(":")[0];

  // Skip rewrite for localhost / IP addresses during development
  if (
    hostnameWithoutPort === "localhost" ||
    hostnameWithoutPort === "127.0.0.1" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostnameWithoutPort)
  ) {
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = hostnameWithoutPort
    .replace(`.${BASE_DOMAIN}`, "")
    .toLowerCase();

  // No real subdomain (www, bare domain, reserved) — pass through
  if (
    RESERVED_SUBDOMAINS.has(subdomain) ||
    subdomain === hostnameWithoutPort // no subdomain was stripped
  ) {
    return NextResponse.next();
  }

  // ── Subdomain detected (e.g. rare.rareimagery.net) ──

  // Console on subdomains → rewrite to /console (same Next.js route) with slug header
  if (pathname.startsWith("/console")) {
    const url = request.nextUrl.clone();
    // Keep /console path as-is (don't add slug prefix)
    const response = NextResponse.rewrite(url);
    response.headers.set("X-Store-Slug", subdomain);
    return response;
  }

  // Other system paths on subdomains → redirect to www
  if (isSystemPath(pathname)) {
    return NextResponse.redirect(
      new URL(`https://${MAIN_HOST}${pathname}${request.nextUrl.search}`),
      308
    );
  }

  // Rewrite to the [creator] route (wireframe-based pages)
  const url = request.nextUrl.clone();
  url.pathname = `/${subdomain}${pathname === "/" ? "" : pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.well-known/).*)",
  ],
};
