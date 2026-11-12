import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const PhoneIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const PinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const ArrowUpIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m18 15-6-6-6 6" />
  </svg>
);

export const GlobeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const MinusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M14 12h4v4H14zm-4-4h4v4H14zm-4-8h4v4H14zm-4-8h4v4H14z" />
  </svg>
);

export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M19 14h2v-2a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2-2v2H5a2 2 0 0 0-2-2zM7 6a2 2 0 0 1 2 2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2zm3 4H5v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2zm2-4a2 2 0 1 1 0 4h2a2 2 0 1 1 0-4zm2 11a2 2 0 1 0 0-4h2a2 2 0 0 0 0 4z" />
  </svg>
);

export const WhatsAppIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M22 16.893a2.3 2.3 0 0 1-2.288 2.017L12 21.95 2.383 13.038a2.3 2.3 0 0 1-2.288-2.017L2.53 10.5a2.3 2.3 0 0 1 0-4.617l8.376-5.017a2.3 2.3 0 0 1 2.563 1.9l7.838 4.7zM12 2a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 12a1 1 0 1 0 0-2v-3a1 1 0 1 0 2 0v3zm2.06-5.908a2.3 2.3 0 0 1 1.828.608l.093.055a3.3 3.3 0 0 1 .898.508l.061.145a2.3 2.3 0 0 1 .388.21l.038.068a2.3 2.3 0 0 1 .212.13l.034.073a3.3 3.3 0 0 1 .172.123l.042.085a2.3 2.3 0 0 1 .09.053l.023.048a3.3 3.3 0 0 1 .033.055l.017.038a2.3 2.3 0 0 1 .014.019z" />
  </svg>
);

export const CartIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
