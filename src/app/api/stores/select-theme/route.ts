import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  void req;
  return NextResponse.json(
    {
      error: "Theme selection is disabled. Use template builder instead.",
      next: "/console/builder",
    },
    { status: 410 }
  );
}
