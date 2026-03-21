-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Companies table
-- ============================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  stock_code TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('大手', '中堅', 'ローコスト', 'その他')),
  founded_year INTEGER,
  headquarters TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_slug ON companies (slug);
CREATE INDEX idx_companies_tier ON companies (tier);

-- ============================================================
-- Articles table
-- ============================================================
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT,
  source_url TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('市場動向', '政策・法規制', '技術・トレンド', '統計データ', '企業動向')),
  article_type TEXT NOT NULL CHECK (article_type IN ('業界', '企業', '両方')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'rejected')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_articles_status ON articles (status);
CREATE INDEX idx_articles_category ON articles (category);
CREATE INDEX idx_articles_article_type ON articles (article_type);
CREATE INDEX idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX idx_articles_created_at ON articles (created_at DESC);
CREATE INDEX idx_articles_source_url ON articles (source_url);

-- ============================================================
-- Article-Company junction table
-- ============================================================
CREATE TABLE article_companies (
  article_id UUID NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, company_id)
);

CREATE INDEX idx_article_companies_company_id ON article_companies (company_id);
CREATE INDEX idx_article_companies_article_id ON article_companies (article_id);

-- ============================================================
-- Sources table
-- ============================================================
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('rss', 'scrape')),
  target_type TEXT CHECK (target_type IN ('業界', '企業', '両方')),
  company_id UUID REFERENCES companies (id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_is_active ON sources (is_active);
CREATE INDEX idx_sources_type ON sources (type);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- Public read access for published articles and companies
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public can read companies"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "Public can read article_companies"
  ON article_companies FOR SELECT
  USING (true);

-- Service role has full access (managed via supabase service role key)

-- ============================================================
-- Seed data: 12 housing companies
-- ============================================================
INSERT INTO companies (name, short_name, slug, website, stock_code, tier, founded_year, headquarters) VALUES
  ('大和ハウス工業株式会社', '大和ハウス', 'daiwa-house', 'https://www.daiwahouse.co.jp/', '1925', '大手', 1955, '大阪府大阪市'),
  ('積水ハウス株式会社', '積水ハウス', 'sekisui-house', 'https://www.sekisuihouse.co.jp/', '1928', '大手', 1960, '大阪府大阪市'),
  ('株式会社一条工務店', '一条工務店', 'ichijo', 'https://www.ichijo.co.jp/', NULL, '大手', 1978, '静岡県浜松市'),
  ('住友林業株式会社', '住友林業', 'sumitomo-forestry', 'https://sfc.jp/', '1911', '大手', 1691, '東京都千代田区'),
  ('積水化学工業株式会社', '積水化学', 'sekisui-chemical', 'https://www.sekisui.co.jp/', '4204', '大手', 1947, '大阪府大阪市'),
  ('三井ホーム株式会社', '三井ホーム', 'mitsui-home', 'https://www.mitsuihome.co.jp/', NULL, '大手', 1974, '東京都新宿区'),
  ('株式会社オープンハウスグループ', 'オープンハウス', 'open-house', 'https://openhouse-group.co.jp/', '3288', '大手', 1997, '東京都千代田区'),
  ('旭化成ホームズ株式会社', 'ヘーベルハウス', 'hebel-haus', 'https://www.asahi-kasei.co.jp/hebel/', NULL, '大手', 1972, '東京都千代田区'),
  ('パナソニック ホームズ株式会社', 'パナソニックホームズ', 'panasonic-homes', 'https://homes.panasonic.com/', NULL, '大手', 1963, '大阪府豊中市'),
  ('タマホーム株式会社', 'タマホーム', 'tama-home', 'https://www.tamahome.jp/', '1419', 'ローコスト', 1998, '東京都港区'),
  ('ミサワホーム株式会社', 'ミサワホーム', 'misawa-home', 'https://www.misawa.co.jp/', '1722', '大手', 1967, '東京都新宿区'),
  ('トヨタホーム株式会社', 'トヨタホーム', 'toyota-home', 'https://www.toyotahome.co.jp/', NULL, '大手', 2003, '愛知県名古屋市');
