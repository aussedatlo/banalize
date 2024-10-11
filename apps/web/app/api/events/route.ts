import { fetchEvents } from "lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get("configId") ?? "";
    const page = searchParams.get("page");
    const result = await fetchEvents({
      configId,
      page: Number(page),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting events:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
