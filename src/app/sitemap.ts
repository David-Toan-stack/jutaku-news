import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://jutaku-news.jp";

  const companies = [
    "daiwa-house",
    "sekisui-house",
    "ichijo",
    "sumitomo-forestry",
    "sekisui-chemical",
    "mitsui-home",
    "open-house",
    "hebel-haus",
    "panasonic-homes",
    "tama-home",
    "misawa-home",
    "toyota-home",
  ];

  const categories = [
    "市場動向",
    "政策・法規制",
    "技術・トレンド",
    "統計データ",
    "企業動向",
  ];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/industry`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...categories.map((cat) => ({
      url: `${baseUrl}/industry/${encodeURIComponent(cat)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/companies`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...companies.map((slug) => ({
      url: `${baseUrl}/companies/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
