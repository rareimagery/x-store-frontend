import { NextRequest, NextResponse } from "next/server";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";
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

function isBypassedPath(pathname: string): boolean {
  if (pathname === "/maintenance") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  return false;
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

  // Skip if there is no real subdomain
  if (
    RESERVED_SUBDOMAINS.has(subdomain) ||
    subdomain === hostnameWithoutPort // no subdomain was stripped
  ) {
    return NextResponse.next();
  }

  // Rewrite to the creator store page
  const url = request.nextUrl.clone();
  url.pathname = `/stores/${subdomain}${url.pathname === "/" ? "" : url.pathname}`;

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
