import Image from "next/image";
import { NAQER_LOGO_PATH, NAQER_LOGO_VIEWBOX } from "@/lib/naqer-logo-path";

/**
 * شعار المطعم. إن وُجد شعار مرفوع (src من Cloudinary) يُعرض، وإلا يظهر الشعار
 * المتجهي المشتق من ملف naqerlogo.pdf مع الحفاظ على الجمل العربي ورمز الهجن والنخيل.
 */
export default function Logo({
  size = 84,
  className,
  src,
  priority = false,
}: {
  size?: number;
  className?: string;
  src?: string | null;
  priority?: boolean;
}) {
  const dimension = `var(--logo-size, ${size}px)`;

  if (src) {
    return (
      <Image
        className={className}
        src={src}
        alt="Al Naqer"
        width={size}
        height={size}
        sizes={`${size}px`}
        priority={priority}
        style={{ objectFit: "contain", width: dimension, height: dimension }}
      />
    );
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={NAQER_LOGO_VIEWBOX}
      style={{ width: dimension, height: dimension }}
      role="img"
      aria-label="Al Naqer"
      focusable="false"
    >
      <title>Al Naqer</title>
      <path fill="currentColor" d={NAQER_LOGO_PATH} />
    </svg>
  );
}