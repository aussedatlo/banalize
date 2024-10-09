import { fetchIpInfos } from "lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const ip = request.url.split("/").pop() ?? "";
    const response = await fetchIpInfos(ip);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error getting config:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
