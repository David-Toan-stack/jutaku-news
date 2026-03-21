import { Article } from "@/types";
import { ArticleCard } from "./ArticleCard";

export function ArticleList({ articles, emptyMessage = "記事がありません" }: { articles: Article[]; emptyMessage?: string }) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
