import {
  type OrderingMode,
  type OrderingModeFeatures,
  ORDERING_MODE_FEATURES,
  type OrderingModeMeta,
  ORDERING_MODES_META,
  normalizeOrderingMode,
  type MenuModeSettings,
} from "./order-settings-types";
import {
  getMenuSettingsAsync,
  updateMenuSettingsAsync,
  invalidateMenuSettingsCache,
} from "./orders-store";
import { logAction } from "./audit";

export {
  type OrderingMode,
  type OrderingModeFeatures,
  ORDERING_MODE_FEATURES,
  type OrderingModeMeta,
  ORDERING_MODES_META,
  normalizeOrderingMode,
};

/**
 * Returns full runtime menu settings with normalized mode and feature flags.
 */
export async function getRuntimeOrderingConfig(forceFresh = false): Promise<{
  settings: MenuModeSettings;
  mode: OrderingMode;
  features: OrderingModeFeatures;
  meta: OrderingModeMeta;
}> {
  const settings = await getMenuSettingsAsync(forceFresh);
  const mode = normalizeOrderingMode(settings.mode);
  const features = ORDERING_MODE_FEATURES[mode];
  const meta = ORDERING_MODES_META[mode];

  return {
    settings,
    mode,
    features,
    meta,
  };
}

/**
 * Checks whether ordering/checkout is allowed under the given mode.
 */
export function isOrderingAllowed(mode: OrderingMode | string): boolean {
  const normalized = normalizeOrderingMode(mode);
  return ORDERING_MODE_FEATURES[normalized].allowOrderCreation;
}

/**
 * Checks whether customer live tracking and order polling should run.
 */
export function isCustomerTrackingAllowed(mode: OrderingMode | string): boolean {
  const normalized = normalizeOrderingMode(mode);
  return ORDERING_MODE_FEATURES[normalized].customerLiveTracking;
}

/**
 * Checks whether this is WhatsApp-based ordering mode.
 */
export function isWhatsAppOrdering(mode: OrderingMode | string): boolean {
  const normalized = normalizeOrderingMode(mode);
  return normalized === "WHATSAPP_DATABASE";
}

/**
 * Checks whether LiveSync/realtime updates should run.
 */
export function isLiveSyncAllowed(mode: OrderingMode | string): boolean {
  const normalized = normalizeOrderingMode(mode);
  return ORDERING_MODE_FEATURES[normalized].adminLiveSync;
}

/**
 * Invalidate server-side configuration memory cache.
 */
export function invalidateOrderingModeCache(): void {
  invalidateMenuSettingsCache();
}

/**
 * Safe mode transition function.
 * Validates the mode, applies updates to DB OrderStore, records in AuditLog,
 * and guarantees zero loss of historical orders or customer data.
 */
export async function switchOrderingModeAsync(
  targetMode: OrderingMode,
  adminUser: { id: string; displayName?: string; email?: string }
): Promise<{ success: boolean; settings: MenuModeSettings; mode: OrderingMode }> {
  const normalized = normalizeOrderingMode(targetMode);
  const currentSettings = await getMenuSettingsAsync(true);
  const previousMode = normalizeOrderingMode(currentSettings.mode);

  const updatedSettings = await updateMenuSettingsAsync({
    mode: normalized,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUser.displayName || adminUser.email || "Admin",
  });

  try {
    await logAction({
      adminId: adminUser.id,
      action: "update",
      entityType: "OrderingMode",
      entityId: "settings_menu_mode",
      summaryAr: `تبديل وضع تشغيل الطلبات من ${ORDERING_MODES_META[previousMode]?.titleAr || previousMode} إلى ${ORDERING_MODES_META[normalized]?.titleAr || normalized} بواسطة ${adminUser.displayName || adminUser.email}`,
      changes: {
        before: { mode: previousMode },
        after: { mode: normalized },
      },
    });
  } catch (err: any) {
    console.warn("[ordering-mode] Audit log warning:", err?.message);
  }

  invalidateOrderingModeCache();

  return {
    success: true,
    settings: updatedSettings,
    mode: normalized,
  };
}
