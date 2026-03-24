import { createClient } from '@supabase/supabase-js';
import { fetchRSSFeed, fetchOgImage, FeedItem } from './rss-fetcher';
import { scrapeCompanyPressReleases } from './scraper';
import { summarizeArticle } from '../gemini/summarizer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMPANY_SLUG_MAP: Record<string, string> = {
  '大和ハウス': 'daiwa-house',
  '積水ハウス': 'sekisui-house',
  '一条工務店': 'ichijo',
  '住友林業': 'sumitomo-forestry',
  '積水化学': 'sekisui-chemical',
  '三井ホーム': 'mitsui-home',
  'オープンハウス': 'open-house',
  'ヘーベルハウス': 'hebel-haus',
  'パナソニックホームズ': 'panasonic-homes',
  'タマホーム': 'tama-home',
  'ミサワホーム': 'misawa-home',
  'トヨタホーム': 'toyota-home',
  // ビルダー (Builders)
  '飯田グループ': 'iida-group',
  '飯田産業': 'iida-group',
  'アーネストワン': 'iida-group',
  '一建設': 'iida-group',
  'ケイアイスター': 'keiaistar',
  'ケイアイスター不動産': 'keiaistar',
  'ポラス': 'polus',
};

const MAX_ARTICLES_PER_RUN = 8;
const DELAY_BETWEEN_CALLS_MS = 4000;
const MIN_CONTENT_LENGTH = 20;
const AUTO_PUBLISH_THRESHOLD = 75;
const MAX_AGE_DAYS = 7;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isDuplicate(sourceUrl: string, title: string): Promise<boolean> {
  // Check by URL
  const { data: urlMatch } = await supabase
    .from('articles')
    .select('id')
    .eq('source_url', sourceUrl)
    .limit(1);
  if (urlMatch && urlMatch.length > 0) return true;

  // Check by exact title
  const { data: titleMatch } = await supabase
    .from('articles')
    .select('id')
    .eq('title', title)
    .limit(1);
  if (titleMatch && titleMatch.length > 0) return true;

  return false;
}

async function getCompanyIdBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single();
  return data?.id || null;
}

function isWithinMaxAge(pubDate: string): boolean {
  const articleDate = new Date(pubDate);
  if (isNaN(articleDate.getTime())) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
  return articleDate >= cutoff;
}

async function processItem(item: FeedItem): Promise<'published' | 'draft' | 'skipped' | 'error'> {
  // Skip short content
  if (item.content.length < MIN_CONTENT_LENGTH && item.title.length < 10) {
    return 'skipped';
  }

  // Skip articles older than MAX_AGE_DAYS
  if (!isWithinMaxAge(item.pubDate)) {
    return 'skipped';
  }

  // Check duplicates
  if (await isDuplicate(item.link, item.title)) {
    return 'skipped';
  }

  try {
    const result = await summarizeArticle(item.title, item.content);

    // Skip non-housing articles
    if (!result.is_housing_related) {
      return 'skipped';
    }

    // Determine status based on confidence
    const isAutoPublish = result.confidence_score >= AUTO_PUBLISH_THRESHOLD;
    const status = isAutoPublish ? 'published' : 'draft';
    const now = new Date().toISOString();

    // Fetch OG image from source article
    const thumbnailUrl = item.thumbnailUrl || await fetchOgImage(item.link);

    // Validate source_name — fallback to hostname if corrupted
    let sourceName = item.sourceName;
    if (!sourceName || /^\?+|\?{2,}/.test(sourceName)) {
      try {
        const hostname = new URL(item.link).hostname.replace('www.', '');
        sourceName = hostname;
      } catch {
        sourceName = 'Unknown';
      }
    }

    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        title: item.title,
        summary: result.summary,
        content: item.content,
        source_url: item.link,
        source_name: sourceName,
        thumbnail_url: thumbnailUrl,
        category: result.category,
        article_type: result.article_type,
        expert_opinion: result.expert_opinion,
        status,
        published_at: isAutoPublish ? now : null,
      })
      .select('id')
      .single();

    if (error || !article) {
      console.error('Failed to insert article:', error);
      return 'error';
    }

    // Link related companies (fuzzy match: check if company name appears in title or Gemini response)
    const allCompanyNames = Object.keys(COMPANY_SLUG_MAP);
    const matchedSlugs = new Set<string>();

    // From Gemini's related_companies (exact match)
    for (const companyName of result.related_companies) {
      const slug = COMPANY_SLUG_MAP[companyName];
      if (slug) matchedSlugs.add(slug);
    }

    // Fuzzy match: scan title and content for company names
    const searchText = `${item.title} ${result.summary}`;
    for (const name of allCompanyNames) {
      if (searchText.includes(name)) {
        matchedSlugs.add(COMPANY_SLUG_MAP[name]);
      }
    }

    // Insert all matched companies
    for (const slug of matchedSlugs) {
      const companyId = await getCompanyIdBySlug(slug);
      if (companyId) {
        await supabase.from('article_companies').upsert({
          article_id: article.id,
          company_id: companyId,
        }, { onConflict: 'article_id,company_id' });
      }
    }

    return status as 'published' | 'draft';
  } catch (error) {
    console.error(`Failed to process item: ${item.title}`, error);
    return 'error';
  }
}

export async function runPipeline(options?: { batch?: number; batchSize?: number }): Promise<{
  published: number;
  drafted: number;
  skipped: number;
  errors: number;
  sources_fetched: number;
  total_sources: number;
  batch?: number;
}> {
  const { data: allSources } = await supabase
    .from('sources')
    .select('*')
    .eq('is_active', true)
    .order('id');

  if (!allSources || allSources.length === 0) {
    return { published: 0, drafted: 0, skipped: 0, errors: 0, sources_fetched: 0, total_sources: 0 };
  }

  // Batch support: split sources into chunks for Vercel 60s limit
  const batchSize = options?.batchSize ?? 3;
  const batch = options?.batch;
  let sources = allSources;

  if (batch !== undefined) {
    const start = batch * batchSize;
    sources = allSources.slice(start, start + batchSize);
    if (sources.length === 0) {
      return { published: 0, drafted: 0, skipped: 0, errors: 0, sources_fetched: 0, total_sources: allSources.length, batch };
    }
  }

  let published = 0;
  let drafted = 0;
  let skipped = 0;
  let errors = 0;
  let totalProcessed = 0;

  for (const source of sources) {
    if (source.type !== 'rss') continue;

    const items = await fetchRSSFeed(source.url, source.name);

    for (const item of items) {
      // Stop if we've processed max articles
      if (totalProcessed >= MAX_ARTICLES_PER_RUN) break;

      const result = await processItem(item);

      switch (result) {
        case 'published': published++; totalProcessed++; break;
        case 'draft': drafted++; totalProcessed++; break;
        case 'skipped': skipped++; break;
        case 'error': errors++; totalProcessed++; break;
      }

      // Rate limit: delay between AI calls (skip for duplicates/skipped)
      if (result !== 'skipped') {
        await sleep(DELAY_BETWEEN_CALLS_MS);
      }
    }

    // Update last_fetched_at
    await supabase
      .from('sources')
      .update({ last_fetched_at: new Date().toISOString() })
      .eq('id', source.id);

    if (totalProcessed >= MAX_ARTICLES_PER_RUN) break;
  }

  // Phase 2: Scrape company press releases (if we still have budget)
  if (totalProcessed < MAX_ARTICLES_PER_RUN) {
    try {
      const scrapedItems = await scrapeCompanyPressReleases();
      for (const item of scrapedItems) {
        if (totalProcessed >= MAX_ARTICLES_PER_RUN) break;

        const result = await processItem(item);
        switch (result) {
          case 'published': published++; totalProcessed++; break;
          case 'draft': drafted++; totalProcessed++; break;
          case 'skipped': skipped++; break;
          case 'error': errors++; totalProcessed++; break;
        }
        if (result !== 'skipped') {
          await sleep(DELAY_BETWEEN_CALLS_MS);
        }
      }
    } catch (error) {
      console.error('Company press release scraping failed:', error);
    }
  }

  return { published, drafted, skipped, errors, sources_fetched: sources.length, total_sources: allSources.length, ...(batch !== undefined ? { batch } : {}) };
}
