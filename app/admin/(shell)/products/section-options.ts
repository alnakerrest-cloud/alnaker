import { prisma } from "@/lib/prisma";

export type SectionOption = { id: string; label: string };

/** يبني خيارات العنابر/الأقسام الفرعية للنموذج بصيغة «القسم › العنبر». */
export async function getSectionOptions(): Promise<SectionOption[]> {
  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      nameAr: true,
      sections: { orderBy: { sortOrder: "asc" }, select: { id: true, titleAr: true } },
    },
  });
  const out: SectionOption[] = [];
  for (const c of cats) {
    for (const s of c.sections) {
      out.push({ id: s.id, label: `${c.nameAr}${s.titleAr ? " › " + s.titleAr : " (افتراضي)"}` });
    }
  }
  return out;
}
