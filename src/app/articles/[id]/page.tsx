import Link from "next/link";
import { notFound } from "next/navigation";
import { sampleArticles, sampleCompanies } from "@/lib/sample-data";
import { Article, Company } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { Metadata } from "next";

const categoryColors: Record<string, string> = {
  "市場動向": "bg-blue-100 text-blue-800",
  "政策・法規制": "bg-purple-100 text-purple-800",
  "技術・トレンド": "bg-green-100 text-green-800",
  "統計データ": "bg-yellow-100 text-yellow-800",
  "企業動向": "bg-orange-100 text-orange-800",
};

async function getArticle(id: string): Promise<Article | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return sampleArticles.find((a) => a.id === id) || null;
    }
    return data as Article;
  } catch {
    return sampleArticles.find((a) => a.id === id) || null;
  }
}

async function getRelatedCompanies(articleId: string): Promise<Company[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: links, error: linkError } = await supabase
      .from("article_companies")
      .select("company_id")
      .eq("article_id", articleId);

    if (linkError || !links || links.length === 0) {
      return getSampleRelatedCompanies(articleId);
    }

    const companyIds = links.map(
      (l: { company_id: string }) => l.company_id
    );
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .in("id", companyIds);

    if (error || !data || data.length === 0) {
      return getSampleRelatedCompanies(articleId);
    }
    return data as Company[];
  } catch {
    return getSampleRelatedCompanies(articleId);
  }
}

function getSampleRelatedCompanies(articleId: string): Company[] {
  const article = sampleArticles.find((a) => a.id === articleId);
  if (!article) return [];
  return sampleCompanies.filter(
    (c) =>
      article.title.includes(c.short_name) ||
      article.title.includes(c.name)
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) return { title: "記事が見つかりません" };
  return {
    title: article.title,
    description: article.summary,
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    notFound();
  }

  const relatedCompanies = await getRelatedCompanies(article.id);

  const timeAgo = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), {
        addSuffix: true,
        locale: ja,
      })
    : "";

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/" className="hover:underline">
          ホーム
        </Link>
        <span className="mx-2">/</span>
        <Link href="/industry" className="hover:underline">
          ニュース
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 line-clamp-1">{article.title}</span>
      </nav>

      {/* Article Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              categoryColors[article.category] || "bg-gray-100 text-gray-800"
            }`}
          >
            {article.category}
          </span>
          {article.article_type !== "業界" && (
            <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-700 font-medium">
              企業ニュース
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
          {article.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{article.source_name}</span>
          {publishedDate && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>{publishedDate}</span>
            </>
          )}
          {timeAgo && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>{timeAgo}</span>
            </>
          )}
        </div>
      </header>

      {/* Summary */}
      <div className="bg-blue-50 border-l-4 border-[#1a365d] p-4 sm:p-5 rounded-r-lg">
        <p className="text-gray-800 leading-relaxed font-medium">
          {article.summary}
        </p>
      </div>

      {/* Content */}
      {article.content && (
        <div className="prose prose-gray max-w-none">
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {article.content}
          </div>
        </div>
      )}

      {/* Source Link */}
      <div className="border-t border-gray-200 pt-6">
        <a
          href={article.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[#1a365d] hover:underline font-medium text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          元の記事を読む（{article.source_name}）
        </a>
      </div>

      {/* Related Companies */}
      {relatedCompanies.length > 0 && (
        <section className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">関連企業</h2>
          <div className="flex flex-wrap gap-3">
            {relatedCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/companies/${company.slug}`}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 hover:shadow-sm transition-shadow"
              >
                <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-[#1a365d]">
                  {company.short_name.charAt(0)}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {company.short_name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
