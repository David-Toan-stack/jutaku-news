import Link from "next/link";
import { ArticleList } from "@/components/articles/ArticleList";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { sampleArticles, sampleCompanies } from "@/lib/sample-data";
import { Article, Company } from "@/types";

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

    if (error || !data || data.length === 0) {
      return sampleArticles;
    }
    return data as Article[];
  } catch {
    return sampleArticles;
  }
}

async function getFeaturedCompanies(): Promise<Company[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("tier", "大手")
      .order("name")
      .limit(12);

    if (error || !data || data.length === 0) {
      return sampleCompanies;
    }
    return data as Company[];
  } catch {
    return sampleCompanies;
  }
}

export default async function HomePage() {
  const [articles, companies] = await Promise.all([
    getLatestArticles(),
    getFeaturedCompanies(),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1a365d] mb-4">
          住宅ニュースまとめ
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          住宅業界の最新ニュースとハウスメーカー情報をまとめてお届け。
          <br className="hidden sm:block" />
          大手ハウスメーカーの動向から業界トレンドまで、毎日更新。
        </p>
      </section>

      {/* Latest News Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            最新ニュース
          </h2>
          <Link
            href="/industry"
            className="text-sm text-[#1a365d] hover:underline font-medium"
          >
            すべて見る →
          </Link>
        </div>
        <ArticleList articles={articles} />
      </section>

      {/* Featured Companies Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            注目企業
          </h2>
          <Link
            href="/companies"
            className="text-sm text-[#1a365d] hover:underline font-medium"
          >
            すべて見る →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:overflow-x-visible sm:pb-0">
          {companies.map((company) => (
            <div key={company.id} className="min-w-[240px] sm:min-w-0">
              <CompanyCard company={company} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
