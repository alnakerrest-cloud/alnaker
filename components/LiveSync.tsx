"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * تحديث لحظي آمن للموقع العام: يستعلم بصمة المحتوى دوريًا، وعند تغيّرها يستدعي
 * router.refresh() ليُعيد جلب بيانات RSC الطازجة (بعد أن يكون revalidatePath قد أبطَلَ
 * الكاش على الخادم عند التعديل).
 *
 * نستعلم دائمًا (حتى لو العلامة في الخلفية) حتى لا تفوت أي علامة تحديثًا؛ لكن نؤجّل
 * router.refresh() للعلامة المخفية ونُنفّذه فور إظهارها — هذا يوفّر إعادة الرسم بلا فايدة
 * مع ضمان أن أي علامة مفتوحة تُظهر أحدث محتوى دون إعادة تحميل يدوية.
 */
export default function LiveSync({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  const seen = useRef<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();

    const applyIfVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      if (dirty.current) {
        dirty.current = false;
        router.refresh();
      }
    };

    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch("/api/content-version", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { v?: string };
          const v = data.v;
          if (v && v !== "unavailable") {
            if (seen.current === null) {
              seen.current = v;
            } else if (v !== seen.current) {
              seen.current = v;
              dirty.current = true;
            }
            if (dirty.current) {
              applyIfVisible();
            }
          }
        }
      } catch {
        /* تجاهل أي عارض صافي أو إجهاض */
      } finally {
        if (!stopped) timer = setTimeout(tick, intervalMs);
      }
    };

    const onVisible = () => {
      applyIfVisible();
      tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    timer = setTimeout(tick, intervalMs);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
