import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface SummaryResult {
  summary: string;
  category: string;
  article_type: string;
  related_companies: string[];
}

export async function summarizeArticle(title: string, content: string): Promise<SummaryResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `あなたは住宅業界ニュースの編集アシスタントです。
以下のニュース記事を分析し、JSON形式で回答してください。

【記事タイトル】${title}
【記事内容】${content}

回答形式（JSONのみ、他のテキストは不要）:
{
  "summary": "200-300字の要約",
  "category": "市場動向 | 政策・法規制 | 技術・トレンド | 統計データ | 企業動向",
  "article_type": "業界 | 企業 | 両方",
  "related_companies": ["大和ハウス", "積水ハウス"]
}

注意:
- categoryは必ず「市場動向」「政策・法規制」「技術・トレンド」「統計データ」「企業動向」のいずれかを選択
- article_typeは必ず「業界」「企業」「両方」のいずれかを選択
- related_companiesは該当なしの場合は空配列[]
- 対象企業: 大和ハウス、積水ハウス、一条工務店、住友林業、積水化学、三井ホーム、オープンハウス、ヘーベルハウス、パナソニックホームズ、タマホーム、ミサワホーム、トヨタホーム`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Gemini response as JSON');
  }

  return JSON.parse(jsonMatch[0]) as SummaryResult;
}
