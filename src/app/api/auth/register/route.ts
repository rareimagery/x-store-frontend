import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Account creation is available only through Sign up with X." },
    { status: 403 }
  );
}
