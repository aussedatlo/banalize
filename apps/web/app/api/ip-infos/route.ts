import { fetchIpInfos } from "lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ips = searchParams.getAll("ips") ?? [];
    const result = await fetchIpInfos({ ips });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting events:", error);
    return NextResponse.json(error);
  }
}
