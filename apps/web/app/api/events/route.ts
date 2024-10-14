import { EventStatus, EventType } from "@banalize/types";
import { fetchEvents } from "lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get("configId") ?? "";
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const type = searchParams.getAll("type");
    const ip = searchParams.get("ip");
    const status = searchParams.getAll("status");

    const { data, totalCount } = await fetchEvents({
      configId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type: type ? (type as EventType[]) : undefined,
      ip: ip ? ip : undefined,
      status: status ? (status as EventStatus[]) : undefined,
    });

    return NextResponse.json(data, {
      headers: { "x-total-count": totalCount.toString() },
    });
  } catch (error) {
    console.error("Error getting events:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
