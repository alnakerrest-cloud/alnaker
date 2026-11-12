import { NextResponse } from "next/server";
import { getContentVersion } from "@/lib/content-version";

// نقطة قراءة فقط تُرجع بصمة نسخة المحتوى. بلا مصادقة لأنها لا تكشف أي بيانات —
// فقط بصمة لا معنى لها، تُستخدم لقرار router.refresh() في المتصفح.
export const dynamic = "force-dynamic";

export async function GET() {
  const v = await getContentVersion();
  return NextResponse.json({ v }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
