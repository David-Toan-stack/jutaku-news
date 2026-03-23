import { FeedItem } from './rss-fetcher';

const HEADERS = {
  'User-Agent': 'JutakuNews/1.0 (Housing Industry News Aggregator)',
  'Accept': 'text/html',
};

interface ScraperConfig {
  url: string;
  sourceName: string;
  linkPattern: RegExp;
  titlePattern: RegExp;
  baseUrl: string;
  maxItems: number;
}

const COMPANY_SCRAPERS: ScraperConfig[] = [
  {
    url: 'https://www.daiwahouse.co.jp/about/release/house/',
    sourceName: '大和ハウス プレスリリース',
    linkPattern: /href="(\/about\/release\/house\/\d{14}\.html)"/g,
    titlePattern: /<title>([^<]*)<\/title>/,
    baseUrl: 'https://www.daiwahouse.co.jp',
    maxItems: 10,
  },
  {
    url: 'https://www.sekisuihouse.co.jp/company/topics/',
    sourceName: '積水ハウス トピックス',
    linkPattern: /href="(\/company\/topics\/topics_\d{4}\/\d{8}\/)"/g,
    titlePattern: /<title>([^<]*)<\/title>/,
    baseUrl: 'https://www.sekisuihouse.co.jp',
    maxItems: 10,
  },
  {
    url: 'https://sfc.jp/information/news/',
    sourceName: '住友林業 ニュースリリース',
    linkPattern: /href="(\/information\/news\/\d{4}\/[^"]+\.html)"/g,
    titlePattern: /<title>([^<]*)<\/title>/,
    baseUrl: 'https://sfc.jp',
    maxItems: 10,
  },
  {
    url: 'https://homes.panasonic.com/company/news/release/',
    sourceName: 'パナソニックホームズ プレスリリース',
    linkPattern: /href="(\/company\/news\/release\/\d{4}\/\d{4}\.html)"/g,
    titlePattern: /<title>([^<]*)<\/title>/,
    baseUrl: 'https://homes.panasonic.com',
    maxItems: 10,
  },
];

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return '';
  return res.text();
}

function extractLinks(html: string, pattern: RegExp, baseUrl: string, max: number): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  let match;
  const regex = new RegExp(pattern.source, pattern.flags);
  while ((match = regex.exec(html)) !== null && links.length < max) {
    const fullUrl = match[1].startsWith('http') ? match[1] : `${baseUrl}${match[1]}`;
    if (!seen.has(fullUrl)) {
      seen.add(fullUrl);
      links.push(fullUrl);
    }
  }
  return links;
}

async function getArticleTitle(url: string): Promise<string> {
  try {
    const html = await fetchPage(url);
    const match = html.match(/<title>([^<]*)<\/title>/);
    if (match) {
      // Clean up title - remove site name suffix
      return match[1]
        .replace(/[|｜].*$/, '')
        .replace(/ - .*$/, '')
        .trim();
    }
    return '';
  } catch {
    return '';
  }
}

export async function scrapeCompanyPressReleases(): Promise<FeedItem[]> {
  const items: FeedItem[] = [];

  for (const config of COMPANY_SCRAPERS) {
    try {
      const html = await fetchPage(config.url);
      if (!html) continue;

      const links = extractLinks(html, config.linkPattern, config.baseUrl, config.maxItems);

      for (const link of links.slice(0, 5)) { // Max 5 per company to limit API calls
        const title = await getArticleTitle(link);
        if (title && title.length > 5) {
          items.push({
            title,
            link,
            content: title, // Title only - Gemini will work with this
            pubDate: new Date().toISOString(),
            sourceName: config.sourceName,
          });
        }
      }
    } catch (error) {
      console.error(`Scraper failed for ${config.sourceName}:`, error);
    }
  }

  return items;
}
