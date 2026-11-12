export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ar';

export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v);
export const dirOf = (l: Locale) => (l === 'ar' ? 'rtl' : 'ltr');

const ar = {
  brand: 'قرية الناقر',
  tagline: 'أصالة المندي والمشويات والمأكولات البدوية',
  metaTitle: 'منيو قرية الناقر | دمياط وجمصة',
  metaDescription:
    'المنيو الإلكتروني لقرية الناقر — المندي، المشويات، الصواني، المأكولات البدوية، المشروبات والحلويات. فرع جمصة وفرع دمياط الجديدة.',
  food: 'الأكل',
  drinks: 'المشروبات',
  drinksFull: 'المشروبات والحلويات',
  search: 'ابحث في المنيو…',
  noResults: 'مفيش نتائج لبحثك، جرّب كلمة تانية',
  currency: 'ج.م',
  call: 'اتصل بنا',
  directions: 'الاتجاهات',
  branches: 'فروعنا',
  vat: 'الأسعار الموضحة تشمل ضريبة القيمة المضافة',
  service: 'يتم إضافة خدمة 12٪ داخل القرية',
  backToTop: 'للأعلى',
  switchTo: 'English',
  scanTitle: 'امسح الكود لعرض المنيو',
  scanSub: 'Scan to view the menu',
  print: 'طباعة',
  downloadSvg: 'تحميل SVG',
  openMenu: 'افتح المنيو',
  notFound: 'الصفحة غير موجودة',
  goHome: 'العودة للمنيو',
  menu: 'المنيو',
  categories: 'أقسام المنيو',
  rights: 'جميع الحقوق محفوظة',
} as const;

const en: Record<keyof typeof ar, string> = {
  brand: 'Al Naqer Village',
  tagline: 'Authentic Mandi, Grills & Bedouin Cuisine',
  metaTitle: 'Al Naqer Village Menu | Damietta & Gamasa',
  metaDescription:
    'Digital menu of Al Naqer Village — mandi, grills, family trays, Bedouin dishes, drinks and desserts. Gamasa and New Damietta branches.',
  food: 'Food',
  drinks: 'Drinks',
  drinksFull: 'Drinks & Desserts',
  search: 'Search the menu…',
  noResults: 'No results found, try another word',
  currency: 'EGP',
  call: 'Call us',
  directions: 'Directions',
  branches: 'Our Branches',
  vat: 'All prices include VAT',
  service: 'A 12% service charge is added for dine-in at the village',
  backToTop: 'Top',
  switchTo: 'العربية',
  scanTitle: 'Scan to view the menu',
  scanSub: 'امسح الكود لعرض المنيو',
  print: 'Print',
  downloadSvg: 'Download SVG',
  openMenu: 'Open the menu',
  notFound: 'Page not found',
  goHome: 'Back to the menu',
  menu: 'Menu',
  categories: 'Menu categories',
  rights: 'All rights reserved',
};

export const ui = { ar, en } as const;
