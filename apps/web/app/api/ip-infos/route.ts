import { fetchIpInfosForMultipleIps } from "lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ips = searchParams.get("ips") ?? "";
    const result = await fetchIpInfosForMultipleIps(ips.split(","));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting events:", error);
    return NextResponse.json(error);
  }
}
