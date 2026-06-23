import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { userId } = await request.json();

    if (!id || !userId) {
      return NextResponse.json({ error: "Missing receipt id or userId" }, { status: 400 });
    }

    const { data: receipt, error: fetchError } = await supabase
      .from("receipts")
      .select("image_url")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;

    const { error: itemDeleteError } = await supabase
      .from("receipt_items")
      .delete()
      .eq("receipt_id", id)
      .eq("user_id", userId);

    if (itemDeleteError) throw itemDeleteError;

    const { error: deleteError } = await supabase
      .from("receipts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) throw deleteError;

    if (receipt?.image_url) {
      const { error: storageError } = await supabase.storage.from("receipts").remove([receipt.image_url]);
      if (storageError) {
        console.error("Receipt image cleanup error:", storageError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { userId, payment_status, payment_method } = await request.json();

    if (!id || !userId) {
      return NextResponse.json({ error: "Missing receipt id or userId" }, { status: 400 });
    }

    const { data: receipt, error: fetchError } = await supabase
      .from("receipts")
      .select("raw_ocr_data")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;

    const current = typeof receipt.raw_ocr_data === "object" && receipt.raw_ocr_data !== null
      ? receipt.raw_ocr_data as Record<string, unknown>
      : {};

    const nextRawData = {
      ...current,
      ...(payment_status ? { payment_status } : {}),
      ...(payment_method ? { payment_method } : {}),
    };

    const { error: updateError } = await supabase
      .from("receipts")
      .update({ raw_ocr_data: nextRawData })
      .eq("id", id)
      .eq("user_id", userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
