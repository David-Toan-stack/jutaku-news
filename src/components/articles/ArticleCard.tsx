import Link from "next/link";
import { Article } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

const categoryColors: Record<string, string> = {
  "市場動向": "bg-blue-100 text-blue-800",
  "政策・法規制": "bg-purple-100 text-purple-800",
  "技術・トレンド": "bg-green-100 text-green-800",
  "統計データ": "bg-yellow-100 text-yellow-800",
  "企業動向": "bg-orange-100 text-orange-800",
};

export function ArticleCard({ article }: { article: Article }) {
  const timeAgo = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ja })
    : "";

  return (
    <article className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      <Link href={`/articles/${article.id}`} className="block p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[article.category] || "bg-gray-100 text-gray-800"}`}>
            {article.category}
          </span>
          {article.article_type !== "業界" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">
              企業
            </span>
          )}
        </div>
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-snug">
          {article.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {article.summary}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{article.source_name}</span>
          <span>{timeAgo}</span>
        </div>
      </Link>
    </article>
  );
}
