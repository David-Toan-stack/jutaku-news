/**
 * Standalone script to run the news pipeline.
 * Used by GitHub Actions cron — no Vercel timeout limits.
 *
 * Usage: npx tsx scripts/fetch-news.ts
 */

import { createClient } from '@supabase/supabase-js';
import { fetchRSSFeed, fetchOgImage, FeedItem } from '../src/lib/pipeline/rss-fetcher';
import { scrapeCompanyPressReleases } from '../src/lib/pipeline/scraper';
import { summarizeArticle } from '../src/lib/gemini/summarizer';

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
  '飯田グループ': 'iida-group',
  '飯田産業': 'iida-group',
  'アーネストワン': 'iida-group',
  '一建設': 'iida-group',
  'ケイアイスター': 'keiaistar',
  'ケイアイスター不動産': 'keiaistar',
  'ポラス': 'polus',
};

const MAX_ARTICLES_PER_RUN = 15;
const DELAY_BETWEEN_CALLS_MS = 8000;
const MIN_CONTENT_LENGTH = 20;
const AUTO_PUBLISH_THRESHOLD = 75;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isDuplicate(sourceUrl: string, title: string): Promise<boolean> {
  const { data: urlMatch } = await supabase
    .from('articles').select('id').eq('source_url', sourceUrl).limit(1);
  if (urlMatch && urlMatch.length > 0) return true;

  const { data: titleMatch } = await supabase
    .from('articles').select('id').eq('title', title).limit(1);
  if (titleMatch && titleMatch.length > 0) return true;

  return false;
}

async function getCompanyIdBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase.from('companies').select('id').eq('slug', slug).single();
  return data?.id || null;
}

async function processItem(item: FeedItem): Promise<'published' | 'draft' | 'skipped' | 'error'> {
  if (item.content.length < MIN_CONTENT_LENGTH && item.title.length < 10) return 'skipped';
  if (await isDuplicate(item.link, item.title)) return 'skipped';

  try {
    let result;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        result = await summarizeArticle(item.title, item.content);
        break;
      } catch (e: any) {
        if (e?.status === 429 && attempt < 4) {
          const waitSec = 30 + attempt * 15;
          console.log(`  ⏳ Rate limited (attempt ${attempt + 1}/5), waiting ${waitSec}s...`);
          await sleep(waitSec * 1000);
          continue;
        }
        throw e;
      }
    }
    if (!result) return 'error';
    if (!result.is_housing_related) return 'skipped';

    const isAutoPublish = result.confidence_score >= AUTO_PUBLISH_THRESHOLD;
    const status = isAutoPublish ? 'published' : 'draft';
    const now = new Date().toISOString();
    const thumbnailUrl = item.thumbnailUrl || await fetchOgImage(item.link);

    let sourceName = item.sourceName;
    if (!sourceName || /^\?+|\?{2,}/.test(sourceName)) {
      try { sourceName = new URL(item.link).hostname.replace('www.', ''); }
      catch { sourceName = 'Unknown'; }
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

    const allCompanyNames = Object.keys(COMPANY_SLUG_MAP);
    const matchedSlugs = new Set<string>();

    for (const companyName of result.related_companies) {
      const slug = COMPANY_SLUG_MAP[companyName];
      if (slug) matchedSlugs.add(slug);
    }

    const searchText = `${item.title} ${result.summary}`;
    for (const name of allCompanyNames) {
      if (searchText.includes(name)) matchedSlugs.add(COMPANY_SLUG_MAP[name]);
    }

    for (const slug of matchedSlugs) {
      const companyId = await getCompanyIdBySlug(slug);
      if (companyId) {
        await supabase.from('article_companies').upsert(
          { article_id: article.id, company_id: companyId },
          { onConflict: 'article_id,company_id' }
        );
      }
    }

    return status as 'published' | 'draft';
  } catch (error) {
    console.error(`Failed to process item: ${item.title}`, error);
    return 'error';
  }
}

async function main() {
  console.log('=== Jutaku News Pipeline ===');
  console.log(`Start: ${new Date().toISOString()}`);

  const { data: sources } = await supabase
    .from('sources').select('*').eq('is_active', true);

  if (!sources || sources.length === 0) {
    console.log('No active sources found.');
    return;
  }

  console.log(`Found ${sources.length} active sources`);

  let published = 0, drafted = 0, skipped = 0, errors = 0, totalProcessed = 0;

  for (const source of sources) {
    if (source.type !== 'rss') continue;

    console.log(`\nFetching: ${source.name} (${source.url})`);
    const items = await fetchRSSFeed(source.url, source.name);
    console.log(`  → ${items.length} items found`);

    for (const item of items) {
      if (totalProcessed >= MAX_ARTICLES_PER_RUN) break;

      const result = await processItem(item);
      switch (result) {
        case 'published': published++; totalProcessed++; console.log(`  ✓ Published: ${item.title}`); break;
        case 'draft': drafted++; totalProcessed++; console.log(`  ○ Draft: ${item.title}`); break;
        case 'skipped': skipped++; break;
        case 'error': errors++; totalProcessed++; console.log(`  ✗ Error: ${item.title}`); break;
      }

      if (result !== 'skipped') await sleep(DELAY_BETWEEN_CALLS_MS);
    }

    await supabase.from('sources').update({ last_fetched_at: new Date().toISOString() }).eq('id', source.id);
    if (totalProcessed >= MAX_ARTICLES_PER_RUN) break;
  }

  if (totalProcessed < MAX_ARTICLES_PER_RUN) {
    try {
      console.log('\nScraping company press releases...');
      const scrapedItems = await scrapeCompanyPressReleases();
      for (const item of scrapedItems) {
        if (totalProcessed >= MAX_ARTICLES_PER_RUN) break;
        const result = await processItem(item);
        switch (result) {
          case 'published': published++; totalProcessed++; console.log(`  ✓ Published: ${item.title}`); break;
          case 'draft': drafted++; totalProcessed++; console.log(`  ○ Draft: ${item.title}`); break;
          case 'skipped': skipped++; break;
          case 'error': errors++; totalProcessed++; console.log(`  ✗ Error: ${item.title}`); break;
        }
        if (result !== 'skipped') await sleep(DELAY_BETWEEN_CALLS_MS);
      }
    } catch (error) {
      console.error('Company press release scraping failed:', error);
    }
  }

  console.log('\n=== Results ===');
  console.log(`Published: ${published}`);
  console.log(`Drafted: ${drafted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`End: ${new Date().toISOString()}`);

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Pipeline fatal error:', err);
  process.exit(1);
});
