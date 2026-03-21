import { createClient } from '@supabase/supabase-js';
import { fetchRSSFeed, FeedItem } from './rss-fetcher';
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
};

async function isDuplicate(sourceUrl: string): Promise<boolean> {
  const { data } = await supabase
    .from('articles')
    .select('id')
    .eq('source_url', sourceUrl)
    .limit(1);
  return (data && data.length > 0) || false;
}

async function getCompanyIdBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single();
  return data?.id || null;
}

async function processItem(item: FeedItem): Promise<void> {
  if (await isDuplicate(item.link)) {
    return;
  }

  try {
    const result = await summarizeArticle(item.title, item.content);

    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        title: item.title,
        summary: result.summary,
        content: item.content,
        source_url: item.link,
        source_name: item.sourceName,
        category: result.category,
        article_type: result.article_type,
        status: 'draft',
      })
      .select('id')
      .single();

    if (error || !article) {
      console.error('Failed to insert article:', error);
      return;
    }

    // Link related companies
    for (const companyName of result.related_companies) {
      const slug = COMPANY_SLUG_MAP[companyName];
      if (slug) {
        const companyId = await getCompanyIdBySlug(slug);
        if (companyId) {
          await supabase.from('article_companies').insert({
            article_id: article.id,
            company_id: companyId,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Failed to process item: ${item.title}`, error);
  }
}

export async function runPipeline(): Promise<{ processed: number; errors: number }> {
  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .eq('is_active', true);

  if (!sources || sources.length === 0) {
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const source of sources) {
    if (source.type === 'rss') {
      const items = await fetchRSSFeed(source.url, source.name);
      for (const item of items) {
        try {
          await processItem(item);
          processed++;
        } catch {
          errors++;
        }
      }

      await supabase
        .from('sources')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', source.id);
    }
  }

  return { processed, errors };
}
