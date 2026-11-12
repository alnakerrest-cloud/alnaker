"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { importItemSchema, firstIssue, splitList, type ImportItemInput } from "@/lib/admin/schemas";
import { fdStr } from "@/lib/admin/form";

export type ImportResult = { created: number; skipped: number; failed: number; jobId: string };
export type ImportActionState = { ok?: boolean; error?: string; result?: ImportResult };

type RawPrice = { labelAr?: string; price: string | number; maxPrice?: string | number | null };
type RawItem = {
  categoryAr: string;
  sectionAr?: string;
  nameAr: string;
  descAr?: string;
  badge?: string;
  ingredientsAr?: string[] | string;
  sourcePage?: number | string | null;
  prices: RawPrice[];
};

const toNum = (v: string | number | null | undefined): number | null => {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** يستورد العناصر المعتمدة فقط داخل معاملة واحدة: إنشاء أو تخطّي (بلا دمج تلقائي مع الموجود). */
export async function importApproved(_prev: ImportActionState, fd: FormData): Promise<ImportActionState> {
  const admin = await requireAdmin(["OWNER"]); // الاستيراد/النشر للمالك فقط
  const raw = fdStr(fd, "items");
  let items: RawItem[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { error: "حمولة غير صالحة" };
    items = parsed as RawItem[];
  } catch {
    return { error: "تعذّر قراءة العناصر" };
  }
  if (!items.length) return { error: "لم تتم الموافقة على أي عنصر للاستيراد" };

  // تحقّق Zod لكل عنصر قبل أي كتابة؛ نحتفظ برسالة الأولى إن فشل أي عنصر.
  const validated: ImportItemInput[] = [];
  for (const it of items) {
    const obj = {
      categoryAr: String(it.categoryAr ?? "").trim(),
      sectionAr: String(it.sectionAr ?? "").trim() || undefined,
      nameAr: String(it.nameAr ?? "").trim(),
      descAr: String(it.descAr ?? "").trim() || undefined,
      badge: it.badge === "SIGNATURE" || it.badge === "OFFER" ? it.badge : null,
      ingredientsAr: Array.isArray(it.ingredientsAr) ? it.ingredientsAr : splitList(String(it.ingredientsAr ?? "")),
      sourcePage: toNum(it.sourcePage),
      prices: (it.prices ?? []).map((p) => ({ labelAr: String(p.labelAr ?? "").trim() || undefined, price: toNum(p.price) ?? NaN, maxPrice: toNum(p.maxPrice) })),
    };
    const v = importItemSchema.safeParse(obj);
    if (!v.success) return { error: `${obj.nameAr || "عنصر"}: ${firstIssue(v.error)}` };
    validated.push(v.data);
  }

  const job = await prisma.importJob.create({
    data: { source: "50500.pdf (نص — مراجعة يدوية)", status: "RUNNING", totalItems: validated.length, startedAt: new Date() },
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  await prisma.$transaction(async (tx) => {
    let slugSeq = 0;
    for (const d of validated) {
      try {
        const dup = await tx.product.findFirst({
          where: { nameAr: d.nameAr, section: { category: { nameAr: d.categoryAr } } },
          select: { id: true },
        });
        const payload = { sourcePage: d.sourcePage, categoryAr: d.categoryAr, sectionAr: d.sectionAr ?? null, nameAr: d.nameAr, prices: d.prices.map((p) => ({ labelAr: p.labelAr ?? null, price: p.price, maxPrice: p.maxPrice })) };

        if (dup) {
          skipped++;
          await tx.importItem.create({ data: { jobId: job.id, kind: "product", ref: d.nameAr, status: "SKIPPED", message: "موجود مسبقًا — لم يُدمج (منع الدمج التلقائي)", payload } });
          continue;
        }

        let cat = await tx.category.findFirst({ where: { nameAr: d.categoryAr } });
        if (!cat) {
          const maxSort = await tx.category.aggregate({ _max: { sortOrder: true } });
          cat = await tx.category.create({
            data: {
              nameAr: d.categoryAr,
              slug: `import-${Date.now().toString(36)}-${slugSeq++}`,
              group: "FOOD",
              layout: "LIST",
              isVisible: true,
              sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
              sections: { create: [{ titleAr: null, sortOrder: 0 }] },
            },
          });
        }
        const wantTitle = d.sectionAr ? d.sectionAr : null;
        let section = await tx.section.findFirst({ where: { categoryId: cat.id, titleAr: wantTitle } });
        if (!section) section = await tx.section.create({ data: { categoryId: cat.id, titleAr: wantTitle, sortOrder: 0 } });

        await tx.product.create({
          data: {
            sectionId: section.id,
            nameAr: d.nameAr,
            descAr: d.descAr ?? null,
            badge: d.badge ?? null,
            ingredientsAr: d.ingredientsAr,
            isAvailable: true,
            isVisible: true,
            sortOrder: 0,
            variants: { create: d.prices.map((p, i) => ({ labelAr: p.labelAr ?? null, price: p.price, maxPrice: p.maxPrice, sortOrder: i, isAvailable: true })) },
          },
        });
        created++;
        await tx.importItem.create({ data: { jobId: job.id, kind: "product", ref: d.nameAr, status: "OK", message: "تم الإنشاء", payload } });
      } catch {
        failed++;
        await tx.importItem.create({
          data: { jobId: job.id, kind: "product", ref: d.nameAr, status: "FAILED", message: "فشل إنشاء العنصر" },
        });
      }
    }

    const status = failed === 0 ? (created + skipped > 0 ? "SUCCESS" : "PARTIAL") : created + skipped > 0 ? "PARTIAL" : "FAILED";
    await tx.importJob.update({
      where: { id: job.id },
      data: { status, processed: created + skipped, failed, finishedAt: new Date() },
    });
  });

  await logAction({
    adminId: admin.id,
    action: "import",
    entityType: "Import",
    entityId: job.id,
    summaryAr: `استيراد نصي مُراجع: أنشئ ${created}، تخطّى ${skipped}، فشل ${failed}`,
    changes: { after: { jobId: job.id, created, skipped, failed } },
  });

  revalidatePath("/admin/import");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/dashboard");
  revalidatePath("/ar");
  revalidatePath("/en");

  return { ok: true, result: { created, skipped, failed, jobId: job.id } };
}
