import { CompanyCard } from "@/components/companies/CompanyCard";
import { sampleCompanies } from "@/lib/sample-data";
import { Company, CompanyTier } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ハウスメーカー一覧",
  description:
    "大手・中堅ハウスメーカーの企業情報一覧。各社の特徴や最新ニュースをチェック。",
};

const tierOrder: CompanyTier[] = ["大手", "中堅", "ローコスト", "その他"];

async function getCompanies(): Promise<Company[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");

    if (error || !data || data.length === 0) {
      return sampleCompanies;
    }
    return data as Company[];
  } catch {
    return sampleCompanies;
  }
}

function groupByTier(
  companies: Company[]
): { tier: CompanyTier; companies: Company[] }[] {
  const groups: Record<string, Company[]> = {};
  for (const company of companies) {
    if (!groups[company.tier]) {
      groups[company.tier] = [];
    }
    groups[company.tier].push(company);
  }

  return tierOrder
    .filter((tier) => groups[tier] && groups[tier].length > 0)
    .map((tier) => ({ tier, companies: groups[tier] }));
}

export default async function CompaniesPage() {
  const companies = await getCompanies();
  const grouped = groupByTier(companies);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          ハウスメーカー一覧
        </h1>
        <p className="text-gray-600">
          主要ハウスメーカーの企業情報と最新ニュースをご覧いただけます。
        </p>
      </div>

      {grouped.map((group) => (
        <section key={group.tier}>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#1a365d] rounded-full inline-block" />
            {group.tier}ハウスメーカー
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {group.companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
