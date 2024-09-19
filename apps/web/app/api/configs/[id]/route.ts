import { deleteConfig, updateConfig } from "lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await updateConfig(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating config:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.url.split("/").pop() ?? "";
    const result = await deleteConfig(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting config:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
