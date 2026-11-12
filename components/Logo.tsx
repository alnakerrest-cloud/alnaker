/**
 * Placeholder emblem (eight-point star). To use the real logo, replace this component's
 * body with <Image src="/logo.png" … /> after dropping the file in /public.
 */
export default function Logo({ size = 84, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Al Naqer"
    >
      <circle cx="50" cy="50" r="47" fill="none" stroke="#E3B25A" strokeWidth="2" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#E3B25A" strokeOpacity=".45" strokeWidth="1" />
      <path
        d="M50 10 L58 32 L80 24 L68 44 L90 50 L68 56 L80 76 L58 68 L50 90 L42 68 L20 76 L32 56 L10 50 L32 44 L20 24 L42 32 Z"
        fill="#E3B25A"
      />
      <circle cx="50" cy="50" r="17" fill="#5C2A26" />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontSize="26"
        fontWeight="700"
        fill="#F6E6C3"
        fontFamily="'Reem Kufi', 'Cairo', serif"
      >
        ن
      </text>
    </svg>
  );
}
