import { createConfig } from "lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createConfig(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating config:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
