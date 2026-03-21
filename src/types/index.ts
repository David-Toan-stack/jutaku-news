export type ArticleCategory = '市場動向' | '政策・法規制' | '技術・トレンド' | '統計データ' | '企業動向';
export type ArticleType = '業界' | '企業' | '両方';
export type ArticleStatus = 'draft' | 'published' | 'rejected';
export type CompanyTier = '大手' | '中堅' | 'ローコスト' | 'その他';

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  source_url: string;
  source_name: string;
  thumbnail_url: string | null;
  category: ArticleCategory;
  article_type: ArticleType;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  companies?: Company[];
}

export interface Company {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  stock_code: string | null;
  tier: CompanyTier;
  founded_year: number | null;
  headquarters: string | null;
  created_at: string;
}

export interface ArticleCompany {
  article_id: string;
  company_id: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'scrape';
  target_type: '業界' | '企業' | '両方' | null;
  company_id: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

export interface ArticleWithCompanies extends Article {
  article_companies: { companies: Company }[];
}
