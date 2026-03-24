import Link from "next/link";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { CompanyAnalysisCard } from "@/components/companies/CompanyAnalysisCard";
import { MarketReportCard } from "@/components/market/MarketReportCard";
import { quarterlyAnalyses } from "@/lib/quarterly-data";
import { marketReports } from "@/lib/market-reports";
import { Article } from "@/types";

async function getLatestArticles(): Promise<Article[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6);

    if (error || !data) return [];
    return data as Article[];
  } catch {
    return [];
  }
}

async function getWeeklyHighlights(): Promise<Article[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    // Notable articles this week: expert opinion + thumbnail, prioritize key categories
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .not("expert_opinion", "is", null)
      .not("thumbnail_url", "is", null)
      .gte("published_at", oneWeekAgo)
      .order("published_at", { ascending: false })
      .limit(20);

    if (!data || data.length === 0) return [];

    // As housing industry expert: prioritize by category importance
    const categoryPriority: Record<string, number> = {
      "市場動向": 1,
      "統計データ": 2,
      "政策・法規制": 3,
      "企業動向": 4,
      "技術・トレンド": 5,
    };
    // Prioritize articles mentioning key companies
    const keyCompanies = ['CBRE', '大和ハウス', '積水ハウス', '住友林業', '積水化学', '一条工務店'];

    const scored = data.map((a: Article) => {
      let score = 0;
      score += (6 - (categoryPriority[a.category] || 5));
      if (keyCompanies.some(c => a.title.includes(c) || (a.summary || '').includes(c))) score += 3;
      if (a.expert_opinion && a.expert_opinion.length > 50) score += 1;
      return { ...a, _score: score };
    });

    scored.sort((a: any, b: any) => b._score - a._score);
    return scored.slice(0, 5).map(({ _score, ...rest }: any) => rest) as Article[];
  } catch {
    return [];
  }
}

const popularCategoryColors: Record<string, string> = {
  "市場動向": "bg-[#0068bc]",
  "政策・法規制": "bg-[#d8609f]",
  "技術・トレンド": "bg-[#008500]",
  "統計データ": "bg-[#f58700]",
  "企業動向": "bg-[#d11100]",
};

export default async function HomePage() {
  const [articles, weeklyHighlights] = await Promise.all([
    getLatestArticles(),
    getWeeklyHighlights(),
  ]);
  const featuredArticle = articles[0];
  const restArticles = articles.slice(1);

  return (
    <div>
      {/* Top banner */}
      <div className="bg-[#003e70] -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-black text-white">住宅業界 最新ニュース</h1>
            <p className="text-[11px] text-[#c1e3ff] mt-0.5">
              住宅・不動産業界の最新動向を毎日更新
            </p>
          </div>
          <span className="text-[11px] text-[#c1e3ff] hidden sm:block">
            {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* Featured + Latest News */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="nk-section-title nk-section-title--red">
            最新ニュース
          </h2>
          <Link
            href="/industry"
            className="text-xs text-[#0068bc] hover:underline font-bold"
          >
            一覧を見る ›
          </Link>
        </div>

        {articles.length === 0 ? (
          <p className="text-[#757575] text-sm py-8 text-center">ニュースを取得中です。しばらくお待ちください。</p>
        ) : (
          <>
            {featuredArticle && (
              <ArticleCard article={featuredArticle} featured={true} />
            )}
            {restArticles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {restArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Weekly Highlights Section */}
      {weeklyHighlights.length > 0 && (
        <section className="mb-10 border-t-4 border-[#d11100] pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="nk-section-title nk-section-title--red">
              今週の注目ニュース
            </h2>
            <Link
              href="/industry"
              className="text-xs text-[#0068bc] hover:underline font-bold"
            >
              もっと見る ›
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {weeklyHighlights.map((pa, i) => (
              <Link
                key={pa.id}
                href={`/articles/${pa.id}`}
                className="group block bg-white border border-[#e8e8e8] rounded overflow-hidden hover:border-[#0068bc] hover:shadow-sm transition-all"
              >
                {pa.thumbnail_url ? (
                  <div className="relative w-full h-[120px] bg-[#f1f1f1] overflow-hidden">
                    <img src={pa.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute top-2 left-2 w-6 h-6 bg-[#d11100] text-white text-[11px] font-black flex items-center justify-center rounded-sm">
                      {i + 1}
                    </span>
                  </div>
                ) : (
                  <div className="relative w-full h-[120px] bg-gradient-to-br from-[#003e70] to-[#0068bc] flex items-center justify-center">
                    <span className="absolute top-2 left-2 w-6 h-6 bg-[#d11100] text-white text-[11px] font-black flex items-center justify-center rounded-sm">
                      {i + 1}
                    </span>
                  </div>
                )}
                <div className="p-2.5">
                  <span className={`text-[9px] px-1.5 py-0.5 text-white font-bold rounded-sm ${popularCategoryColors[pa.category] || "bg-[#757575]"}`}>
                    {pa.category}
                  </span>
                  <h3 className="text-[12px] font-bold text-[#333] leading-snug mt-1.5 line-clamp-2 group-hover:text-[#0068bc] transition-colors">
                    {pa.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Market Reports Section */}
      <section className="mb-10 border-t-4 border-[#008500] pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="nk-section-title" style={{ borderLeftColor: '#008500' }}>
              市場レポート
            </h2>
            <p className="text-[11px] text-[#757575] mt-1 pl-[19px]">
              住宅市場の定期分析レポート
            </p>
          </div>
          <Link
            href="/market-reports"
            className="text-xs text-[#0068bc] hover:underline font-bold"
          >
            すべて見る ›
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {marketReports.slice(0, 2).map((report) => (
            <MarketReportCard key={report.slug} report={report} />
          ))}
        </div>
      </section>

      {/* Company Quarterly Analysis Section */}
      <section className="bg-[#f7f7f7] -mx-4 sm:-mx-6 px-4 sm:px-6 py-8 border-t-4 border-[#0068bc]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="nk-section-title">
                各社動向
              </h2>
              <p className="text-[11px] text-[#757575] mt-1 pl-[19px]">
                主要ハウスメーカーの四半期業績と注目ポイント
              </p>
            </div>
            <Link
              href="/companies"
              className="text-xs text-[#0068bc] hover:underline font-bold"
            >
              すべて見る ›
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quarterlyAnalyses.slice(0, 6).map((analysis) => (
              <CompanyAnalysisCard key={analysis.company_slug} analysis={analysis} />
            ))}
          </div>
          {quarterlyAnalyses.length > 6 && (
            <div className="text-center mt-6">
              <Link
                href="/companies"
                className="inline-flex items-center gap-1 px-6 py-2.5 bg-[#003e70] text-white text-sm font-bold rounded hover:bg-[#326691] transition-colors"
              >
                全12社の分析を見る ›
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
