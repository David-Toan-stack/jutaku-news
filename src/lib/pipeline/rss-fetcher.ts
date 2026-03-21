import Parser from 'rss-parser';

const parser = new Parser({
  headers: {
    'User-Agent': 'JutakuNews/1.0 (Housing Industry News Aggregator)',
  },
  timeout: 10000,
});

export interface FeedItem {
  title: string;
  link: string;
  content: string;
  pubDate: string;
  sourceName: string;
}

export async function fetchRSSFeed(url: string, sourceName: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      content: item.contentSnippet || item.content || item.title || '',
      pubDate: item.pubDate || new Date().toISOString(),
      sourceName,
    }));
  } catch (error) {
    console.error(`Failed to fetch RSS from ${url}:`, error);
    return [];
  }
}
