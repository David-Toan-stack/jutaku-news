"use client";

import { useEffect, useState } from "react";
import { Article } from "@/types";
import { sampleDraftArticles } from "@/lib/sample-data";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

const categoryColors: Record<string, string> = {
  "市場動向": "bg-blue-100 text-blue-800",
  "政策・法規制": "bg-purple-100 text-purple-800",
  "技術・トレンド": "bg-green-100 text-green-800",
  "統計データ": "bg-yellow-100 text-yellow-800",
  "企業動向": "bg-orange-100 text-orange-800",
};

export default function AdminDraftPage() {
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [usingSample, setUsingSample] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, []);

  async function fetchDrafts() {
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setDrafts(sampleDraftArticles);
        setUsingSample(true);
      } else {
        setDrafts(data as Article[]);
        setUsingSample(false);
      }
    } catch {
      setDrafts(sampleDraftArticles);
      setUsingSample(true);
    }
    setLoading(false);
  }

  async function handleAction(id: string, status: "published" | "rejected") {
    setActionLoading(id);

    if (usingSample) {
      // Simulate action on sample data
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      setActionLoading(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
          ...(status === "published"
            ? { published_at: new Date().toISOString() }
            : {}),
        }),
      });

      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (error) {
      console.error("Action failed:", error);
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">下書き記事一覧</h1>
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">下書き記事一覧</h1>
        <span className="text-sm text-gray-500">
          {drafts.length}件の下書き
        </span>
      </div>

      {usingSample && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Supabaseに接続できないため、サンプルデータを表示しています。
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
          <p>承認待ちの下書き記事はありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const timeAgo = formatDistanceToNow(
              new Date(draft.created_at),
              { addSuffix: true, locale: ja }
            );
            const isProcessing = actionLoading === draft.id;

            return (
              <div
                key={draft.id}
                className={`bg-white rounded-lg border border-gray-200 p-5 transition-opacity ${
                  isProcessing ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          categoryColors[draft.category] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {draft.category}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo}</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                      {draft.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {draft.summary}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      出典: {draft.source_name}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAction(draft.id, "published")}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      承認
                    </button>
                    <button
                      onClick={() => handleAction(draft.id, "rejected")}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      却下
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
