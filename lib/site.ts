export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://naqer-menu.vercel.app').replace(/\/$/, '');

export const PHONE_DISPLAY = '01094965222';
export const PHONE_INTL = '+201094965222';

export type Branch = {
  id: string;
  name: { ar: string; en: string };
  address: { ar: string; en: string };
  city: { ar: string; en: string };
  mapQuery: string;
};

export const branches: Branch[] = [
  {
    id: '7fa2be20-67bd-4060-a83a-81ded2550018',
    name: { ar: 'فرع جمصة', en: 'Gamasa Branch' },
    address: {
      ar: 'الطريق الدولي الساحلي، أمام جامعة الدلتا',
      en: 'International Coastal Road, opposite Delta University',
    },
    city: { ar: 'جمصة، مصر', en: 'Gamasa, Egypt' },
    mapQuery: 'Al Naqer Village International Coastal Road Gamasa Egypt',
  },
  {
    id: '6d6528bd-dbd4-4672-aa5f-953063d3a36e',
    name: { ar: 'فرع دمياط الجديدة', en: 'New Damietta Branch' },
    address: { ar: 'مول هادي الجديدة', en: 'Hady Mall' },
    city: { ar: 'دمياط الجديدة، مصر', en: 'New Damietta, Egypt' },
    mapQuery: 'Hady Mall New Damietta Egypt',
  },
];

export const mapsUrl = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
