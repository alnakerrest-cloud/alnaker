import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['ar', 'en'].map((l) => ({
    url: `${SITE_URL}/${l}`,
    changeFrequency: 'weekly',
    priority: 1,
    alternates: { languages: { ar: `${SITE_URL}/ar`, en: `${SITE_URL}/en` } },
  }));
}
