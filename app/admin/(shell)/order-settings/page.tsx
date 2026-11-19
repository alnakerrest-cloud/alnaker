import { requireAdmin } from "@/lib/auth";
import { getMenuSettings } from "@/lib/orders-store";
import { getSiteData } from "@/lib/site-db";
import OrderSettingsClient from "@/components/admin/OrderSettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminOrderSettingsPage() {
  await requireAdmin(["OWNER", "ADMIN"]);

  const settings = getMenuSettings();
  const siteData = await getSiteData("ar");

  const branches = siteData.branches.map((b) => ({
    id: b.id,
    nameAr: b.nameAr,
    nameEn: b.nameEn,
    addressAr: b.addressAr,
    isOrderable: b.isOrderable,
    isActive: b.isActive,
    openingHoursAr: b.openingHoursAr,
    openingHoursEn: b.openingHoursEn,
  }));

  return <OrderSettingsClient initialSettings={settings} branches={branches} />;
}
