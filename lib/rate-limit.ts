// حدّ محاولات تسجيل الدخول (brute-force protection) — نافذة ثابتة في الذاكرة لكل مفتاح (IP+email).
// ملاحظة: على serverless كل نسخة قد تحمل عدّادها المستقل؛ هذا طبقة حماية أولى مناسبة،
// ويمكن لاحقًا ترقيتها إلى طبقة موزّعة (مثل Upstash) إن لزم — بدون Redis الآن حسب القواعد.
type Bucket = { count: number; resetAt: number };
const store = globalThis as unknown as { __rl?: Map<string, Bucket> };
const buckets = (store.__rl ??= new Map<string, Bucket>());

const WINDOW_MS = 60_000; // دقيقة
const MAX_ATTEMPTS = 8;

/** يُرجع true مسموح، أو false محظون. يستخرج مفتاحًا من IP + البريد لتقليل التخمين. */
export function consumeAttempt(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > MAX_ATTEMPTS) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** تصفير العدّاد بعد دخول ناجح. */
export function resetAttempts(key: string): void {
  buckets.delete(key);
}
