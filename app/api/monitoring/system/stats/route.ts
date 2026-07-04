import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

// Proxy for the dashboard KPI stats. Forwards to the backend's
// GET /api/v1/monitoring/system/stats and passes the response through
// unchanged. On any failure it returns { success: false, data: null } so the
// dashboard can degrade gracefully (show placeholders) instead of crashing.
export async function GET(request: NextRequest) {
  try {
    if (!BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL environment variable is not set");
    }
    if (!TENANT_ID) {
      throw new Error("NEXT_PUBLIC_TENANT_ID environment variable is not set");
    }

    const authHeader = request.headers.get("authorization");

    const response = await fetch(`${BASE_URL}/api/v1/monitoring/system/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "tenant-id": TENANT_ID,
        "ngrok-skip-browser-warning": "69420",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(
        `[monitoring/system/stats] HTTP ${response.status}`,
        errorText,
      );
      return NextResponse.json(
        {
          success: false,
          error: `HTTP error! status: ${response.status}`,
          data: null,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[monitoring/system/stats] Error fetching system stats:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch system stats",
        data: null,
      },
      { status: 500 },
    );
  }
}
