import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { const base = "https://lyjy.fr"; return [{ url: base, priority: 1 }, { url: `${base}/boutique`, priority: 0.9 }, { url: `${base}/contact`, priority: 0.5 }, { url: `${base}/cgv-cgu`, priority: 0.3 }]; }
