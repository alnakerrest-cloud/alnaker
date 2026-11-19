"use client";

import { useState } from "react";
import Image from "next/image";
import { NAQER_LOGO_PATH, NAQER_LOGO_VIEWBOX } from "@/lib/naqer-logo-path";

export type LogoVariant = "gold" | "roast" | "auto";

/**
 * شعار قرية الناقر الرسمي المنسجم بصريًا مع Theme الموقع.
 * يدعم نسختين أصليتين متناسقتين:
 * 1. "gold": نسخة الذهب الهادئ الفاخر (--gold-soft / #f6e6c3) المخصصة للخلفيات الداكنة (Hero، Footer، Dark surfaces).
 * 2. "roast": نسخة البني البدوي الداكن (--brand / #5c2a26) المخصصة للخلفيات الفاتحة (اللوحات البيضاء، البطاقات، الطباعة).
 * مع الحفاظ بنسبة 100% على كافة أبعاد وتفاصيل وهيكل اللوجو الأصلي دون أي تشويه أو إعادة رسم.
 */
export default function Logo({
  size = 84,
  className,
  src,
  variant = "gold",
  emblemOnly = false,
  alt = "قرية الناقر",
  priority = false,
}: {
  size?: number;
  className?: string;
  src?: string | null;
  variant?: LogoVariant;
  emblemOnly?: boolean;
  alt?: string;
  priority?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const dimension = `var(--logo-size, ${size}px)`;

  // Choose appropriate official logo asset according to variant/theme
  const defaultAsset = emblemOnly
    ? variant === "roast"
      ? "/brand/naqer-emblem-roast.png"
      : "/brand/naqer-emblem-gold.png"
    : variant === "roast"
    ? "/brand/naqer-logo-roast.png"
    : "/brand/naqer-logo-gold.png";

  const resolvedSrc = src && src.trim().length > 0 ? src : defaultAsset;

  if (!hasError && resolvedSrc) {
    return (
      <Image
        className={className}
        src={resolvedSrc}
        alt={alt}
        width={size}
        height={size}
        sizes={`${size}px`}
        priority={priority}
        onError={() => setHasError(true)}
        style={{
          objectFit: "contain",
          width: dimension,
          height: dimension,
          display: "inline-block",
          verticalAlign: "middle",
        }}
      />
    );
  }

  // Graceful vector SVG fallback with theme color
  const svgFill = variant === "roast" ? "var(--brand, #5c2a26)" : "var(--gold-soft, #f6e6c3)";

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={NAQER_LOGO_VIEWBOX}
      style={{
        width: dimension,
        height: dimension,
        display: "inline-block",
        verticalAlign: "middle",
        color: svgFill,
      }}
      role="img"
      aria-label={alt}
      focusable="false"
    >
      <title>{alt}</title>
      <path fill="currentColor" d={NAQER_LOGO_PATH} />
    </svg>
  );
}
