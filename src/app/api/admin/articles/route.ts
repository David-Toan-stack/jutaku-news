import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    if (!["published", "rejected", "draft"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be published, rejected, or draft." },
        { status: 400 }
      );
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const updateData: Record<string, string> = { status };
    if (status === "published") {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update article:", error);
      return NextResponse.json(
        { error: "Failed to update article" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, article: data });
  } catch (error) {
    console.error("Admin articles PATCH failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
