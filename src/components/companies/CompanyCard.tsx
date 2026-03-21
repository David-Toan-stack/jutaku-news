import Link from "next/link";
import { Company } from "@/types";

const tierColors: Record<string, string> = {
  "大手": "bg-[#1a365d] text-white",
  "中堅": "bg-blue-100 text-blue-800",
  "ローコスト": "bg-green-100 text-green-800",
  "その他": "bg-gray-100 text-gray-800",
};

export function CompanyCard({ company }: { company: Company }) {
  return (
    <Link
      href={`/companies/${company.slug}`}
      className="block bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-bold text-[#1a365d]">
          {company.short_name.charAt(0)}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierColors[company.tier] || tierColors["その他"]}`}>
          {company.tier}
        </span>
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">{company.short_name}</h3>
      <p className="text-sm text-gray-500">{company.name}</p>
      {company.stock_code && (
        <p className="text-xs text-gray-400 mt-2">証券コード: {company.stock_code}</p>
      )}
    </Link>
  );
}
