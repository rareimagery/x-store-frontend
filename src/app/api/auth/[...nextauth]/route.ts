import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

const nextAuth = NextAuth(authOptions);

async function handler(req: NextRequest) {
  try {
    const url = new URL(req.url);
    console.log(`[NextAuth] ${req.method} ${url.pathname}${url.search}`);

    const response = await nextAuth(req);
    return response;
  } catch (error) {
    console.error("[NextAuth] Unhandled error in auth handler:", error);
    throw error;
  }
}

export { handler as GET, handler as POST };
