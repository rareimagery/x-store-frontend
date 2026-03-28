import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    {
      error: "Legacy theme editing is disabled. Use the template builder instead.",
      next: "/console/builder",
    },
    { status: 410 }
  );
}
