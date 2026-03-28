import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Legacy theme chat is disabled. Use the template builder instead.",
      next: "/console/builder",
    },
    { status: 410 }
  );
}
