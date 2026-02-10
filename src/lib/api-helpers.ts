import { NextRequest, NextResponse } from "next/server";

/**
 * Extract groupId from a request's query string.
 * Returns the parsed groupId or a NextResponse error.
 */
export function extractGroupId(request: NextRequest): number | NextResponse {
  const { searchParams } = new URL(request.url);
  const groupIdStr = searchParams.get("groupId");

  if (!groupIdStr) {
    return NextResponse.json(
      { error: "groupId query parameter is required" },
      { status: 400 }
    );
  }

  const groupId = parseInt(groupIdStr, 10);
  if (isNaN(groupId)) {
    return NextResponse.json(
      { error: "groupId must be a number" },
      { status: 400 }
    );
  }

  return groupId;
}
