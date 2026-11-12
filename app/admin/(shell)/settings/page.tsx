import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import SettingsForm from "./settings-form";
import LogoManager from "./logo-manager";
import { updateSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const canManage = admin.role === "OWNER";

  const s = await prisma.restaurantSettings.findUnique({ where: { id: "default" } });
  const initial = {
    brandNameAr: s?.brandNameAr ?? "قرية الناقر",
    taglineAr: s?.taglineAr ?? "",
    phoneDisplay: s?.phoneDisplay ?? "",
    phoneIntl: s?.phoneIntl ?? "",
    currencyAr: s?.currencyAr ?? "ج.م",
    serviceChargePct: s?.serviceChargePct == null ? "" : String(Number(s.serviceChargePct)),
    vatNoteAr: s?.vatNoteAr ?? "",
    serviceNoteAr: s?.serviceNoteAr ?? "",
  };

  return (
    <>
      <div className="admin-topbar">
        <h1>إعدادات المطعم</h1>
        <span className="admin-user-chip">تؤثر مباشرة على الموقع العام</span>
      </div>

      {!canManage ? <p className="admin-flash err">عرض فقط: تعديل إعدادات المطعم متاح للمالك فقط.</p> : null}
      <SettingsForm action={updateSettings} initial={initial} submitLabel="حفظ الإعدادات" readOnly={!canManage} />

      <LogoManager logoUrl={s?.logoUrl ?? null} readOnly={!canManage} />
    </>
  );
}
