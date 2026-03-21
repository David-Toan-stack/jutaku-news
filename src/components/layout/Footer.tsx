export function Footer() {
  return (
    <footer className="bg-[#1a365d] text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold mb-2">住宅ニュースまとめ</h3>
            <p className="text-sm text-gray-300">
              住宅業界の最新ニュースとハウスメーカー情報を毎日お届けします。
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-bold mb-3 text-gray-200">カテゴリ</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/industry" className="hover:text-white transition-colors">業界ニュース</a></li>
              <li><a href="/companies" className="hover:text-white transition-colors">企業一覧</a></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-sm font-bold mb-3 text-gray-200">このサイトについて</h4>
            <p className="text-sm text-gray-300">
              住宅業界のニュースを自動収集・要約し、読みやすくまとめています。
              元記事へのリンクも掲載しています。
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-600 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} 住宅ニュースまとめ. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
