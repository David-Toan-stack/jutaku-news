import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleList } from "@/components/articles/ArticleList";
import { sampleCompanies, sampleArticles } from "@/lib/sample-data";
import { Article, Company } from "@/types";
import type { Metadata } from "next";

async function getCompany(slug: string): Promise<Company | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return sampleCompanies.find((c) => c.slug === slug) || null;
    }
    return data as Company;
  } catch {
    return sampleCompanies.find((c) => c.slug === slug) || null;
  }
}

async function getCompanyArticles(companyId: string): Promise<Article[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: links, error: linkError } = await supabase
      .from("article_companies")
      .select("article_id")
      .eq("company_id", companyId);

    if (linkError || !links || links.length === 0) {
      return getSampleCompanyArticles(companyId);
    }

    const articleIds = links.map((l: { article_id: string }) => l.article_id);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .in("id", articleIds)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return getSampleCompanyArticles(companyId);
    }
    return data as Article[];
  } catch {
    return getSampleCompanyArticles(companyId);
  }
}

function getSampleCompanyArticles(companyId: string): Article[] {
  const company = sampleCompanies.find((c) => c.id === companyId);
  if (!company) return [];
  // Return articles that mention the company name in title
  return sampleArticles.filter(
    (a) =>
      a.title.includes(company.short_name) ||
      a.title.includes(company.name)
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompany(slug);
  if (!company) return { title: "企業が見つかりません" };
  return {
    title: `${company.name}のニュース・企業情報`,
    description: company.description || `${company.name}の最新ニュースと企業情報`,
  };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompany(slug);

  if (!company) {
    notFound();
  }

  const articles = await getCompanyArticles(company.id);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/" className="hover:underline">
          ホーム
        </Link>
        <span className="mx-2">/</span>
        <Link href="/companies" className="hover:underline">
          ハウスメーカー
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{company.short_name}</span>
      </nav>

      {/* Company Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
        <div className="flex items-start gap-4 sm:gap-6 mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-[#1a365d] flex-shrink-0">
            {company.short_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {company.name}
            </h1>
            {company.short_name !== company.name && (
              <p className="text-gray-500 text-sm">{company.short_name}</p>
            )}
          </div>
        </div>

        {company.description && (
          <p className="text-gray-700 leading-relaxed mb-6">
            {company.description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {company.headquarters && (
            <div className="flex gap-2">
              <span className="text-gray-500 min-w-[80px]">本社所在地:</span>
              <span className="text-gray-900">{company.headquarters}</span>
            </div>
          )}
          {company.founded_year && (
            <div className="flex gap-2">
              <span className="text-gray-500 min-w-[80px]">設立年:</span>
              <span className="text-gray-900">{company.founded_year}年</span>
            </div>
          )}
          {company.stock_code && (
            <div className="flex gap-2">
              <span className="text-gray-500 min-w-[80px]">証券コード:</span>
              <span className="text-gray-900">{company.stock_code}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-gray-500 min-w-[80px]">分類:</span>
            <span className="text-gray-900">{company.tier}</span>
          </div>
          {company.website && (
            <div className="flex gap-2 sm:col-span-2">
              <span className="text-gray-500 min-w-[80px]">公式サイト:</span>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1a365d] hover:underline truncate"
              >
                {company.website}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Related Articles */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
          関連ニュース
        </h2>
        <ArticleList
          articles={articles}
          emptyMessage={`${company.short_name}に関連するニュースはまだありません。`}
        />
      </section>
    </div>
  );
}
