// يُنفَّذ مرة واحدة عند إقلاع خادم Next (node runtime). فائدته هنا: إيقاظ compute المُعلّق في Neon
// مبكرًا (تدفئة) حتى لا يكون أوّل طلب حقيقي من المستخدم إقلاعًا باردًا. best-effort تمامًا: لا يرمي
// أي خطأ أبدًا؛ إن فشل الاتصال فتُعالجه إعادة المحاولة (withDbRetry) على مسارات الطلب الفعلية.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    // تجاهل صامت: الطلبات اللاحقة تُعيد المحاولة تلقائيًا.
  }
}
