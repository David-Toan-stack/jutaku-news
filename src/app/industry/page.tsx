import Link from "next/link";
import { ArticleList } from "@/components/articles/ArticleList";
import { sampleArticles } from "@/lib/sample-data";
import { Article, ArticleCategory } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "業界ニュース",
  description:
    "住宅業界の最新ニュース一覧。市場動向、政策・法規制、技術トレンド、統計データなど。",
};

const categories: { label: string; value: string }[] = [
  { label: "すべて", value: "" },
  { label: "市場動向", value: "市場動向" },
  { label: "政策・法規制", value: "政策・法規制" },
  { label: "技術・トレンド", value: "技術・トレンド" },
  { label: "統計データ", value: "統計データ" },
  { label: "企業動向", value: "企業動向" },
];

async function getArticles(
  category?: string
): Promise<Article[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    let query = supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return filterSample(category);
    }
    return data as Article[];
  } catch {
    return filterSample(category);
  }
}

function filterSample(category?: string): Article[] {
  if (!category) return sampleArticles;
  return sampleArticles.filter((a) => a.category === category);
}

export default async function IndustryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = params.category || "";
  const articles = await getArticles(selectedCategory || undefined);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          業界ニュース
        </h1>
        <p className="text-gray-600">
          住宅業界の最新ニュースをカテゴリ別に閲覧できます。
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.value;
          return (
            <Link
              key={cat.value}
              href={
                cat.value
                  ? `/industry?category=${encodeURIComponent(cat.value)}`
                  : "/industry"
              }
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#1a365d] text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>

      {/* Articles Grid */}
      <ArticleList
        articles={articles}
        emptyMessage={
          selectedCategory
            ? `「${selectedCategory}」カテゴリの記事はまだありません。`
            : "記事がありません。"
        }
      />
    </div>
  );
}
