import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Validate CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Support batch processing: ?batch=0, ?batch=1, etc.
    const batchParam = request.nextUrl.searchParams.get("batch");
    const batch = batchParam !== null ? parseInt(batchParam, 10) : undefined;

    // Run the pipeline
    const { runPipeline } = await import("@/lib/pipeline/processor");
    const result = await runPipeline(batch !== undefined ? { batch, batchSize: 3 } : undefined);

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron fetch-news failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
