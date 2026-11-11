import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  const origin = process.env.APP_URL;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/reservation', '/auth','/client'],
    },
    ...(origin?.startsWith('https://')
      ? { sitemap: `${origin}/sitemap.xml` }
      : {}),
  };
}
