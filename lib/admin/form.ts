// مساعدات قراءة FormData مع تحويل الأنواع، حتى تكون مخططات Zod نقية ويُستنتَج types صحيحًا.
export const fdStr = (fd: FormData, k: string): string => String(fd.get(k) ?? "").trim();

export const fdStrOpt = (fd: FormData, k: string): string | undefined => {
  const s = String(fd.get(k) ?? "").trim();
  return s.length ? s : undefined;
};

export const fdBool = (fd: FormData, k: string): boolean => {
  const v = String(fd.get(k) ?? "");
  return v === "on" || v === "true";
};

export const fdNum = (fd: FormData, k: string, def = 0): number => {
  const raw = String(fd.get(k) ?? "").trim();
  if (!raw.length) return def;
  const n = Number(raw);
  return Number.isFinite(n) ? n : def;
};

export const fdInt = (fd: FormData, k: string, def = 0): number => {
  const n = Math.trunc(fdNum(fd, k, def));
  return n;
};

export const fdNumOrNull = (fd: FormData, k: string): number | null => {
  const raw = String(fd.get(k) ?? "").trim();
  if (!raw.length) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** قيمة select قد تكون "" → null. */
export const fdEnumOrNull = (fd: FormData, k: string): string | null => {
  const v = String(fd.get(k) ?? "").trim();
  return v && v !== "NONE" ? v : null;
};
