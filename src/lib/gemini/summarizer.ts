import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface SummaryResult {
  summary: string;
  category: string;
  article_type: string;
  related_companies: string[];
  expert_opinion: string;
  confidence_score: number;
  is_housing_related: boolean;
}

const VALID_CATEGORIES = ['市場動向', '政策・法規制', '技術・トレンド', '統計データ', '企業動向'];
const VALID_TYPES = ['業界', '企業', '両方'];

export async function summarizeArticle(title: string, content: string): Promise<SummaryResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `あなたは住宅業界20年以上の経験を持つシニアアナリスト兼ニュース編集長です。
日本の住宅業界にとって本当に重要なニュースだけを厳選して掲載するニュースサイトの編集を担当しています。

以下のニュース記事を分析し、JSON形式で回答してください。

【記事タイトル】${title}
【記事内容】${content}

回答形式（JSONのみ、他のテキストは不要）:
{
  "summary": "300-500字の詳細な要約",
  "category": "市場動向 | 政策・法規制 | 技術・トレンド | 統計データ | 企業動向",
  "article_type": "業界 | 企業 | 両方",
  "related_companies": ["大和ハウス", "積水ハウス"],
  "expert_opinion": "住宅業界の専門家としての分析・意見（300-500字）",
  "confidence_score": 85,
  "is_housing_related": true
}

■ 記事選定基準（以下に該当しないニュースはconfidence_score 60未満にすること）:
- 住宅メーカー・ビルダーの経営戦略・業績・新商品・技術に直接関わるニュース
- 住宅市場の動向・価格・需給・金利・政策に関する重要な変化
- 省エネ基準・建築基準法・税制改正など住宅に影響する法規制の変更
- 住宅着工統計・地価動向など業界の重要指標
- 住宅業界の人材・技術・DX・サプライチェーンに関する構造的変化
※ 単なる企業イベント告知、展示場オープン、キャンペーン情報、一般的な不動産仲介・管理の話題は重要度が低い

■ 要約ルール:
- summaryは必ず自分の言葉で要点を詳しくまとめること。元記事の文章をそのままコピーしてはいけない
- 要約は「何が起きたか」「なぜ重要か」「業界への影響は何か」「今後の展望」の4点を中心にまとめる
- 具体的な数字（金額、前年比、戸数、比率）があれば必ず含める

■ 専門家意見ルール:
- expert_opinionは住宅業界の専門家として、以下の観点から深い分析を行う：
  (1) このニュースの背景にある構造的要因は何か
  (2) 競合他社や業界全体にどのような影響を与えるか
  (3) 消費者・住宅購入検討者にとってどのような意味があるか
  (4) 今後6-12ヶ月の見通しと注目すべきポイント
- 最後に「— 住宅業界アナリスト」と署名する

■ その他ルール:
- categoryは必ず上記5つのいずれかを選択
- article_typeは必ず「業界」「企業」「両方」のいずれかを選択
- related_companiesは該当なしの場合は空配列[]
- 対象企業（ハウスメーカー）: 大和ハウス、積水ハウス、一条工務店、住友林業、積水化学、三井ホーム、オープンハウス、ヘーベルハウス、パナソニックホームズ、タマホーム、ミサワホーム、トヨタホーム
- 対象企業（ビルダー）: 飯田グループ、ケイアイスター、ポラス
- confidence_scoreは0-100。本当に重要な住宅業界ニュースは80以上、まあまあ重要は70-79、重要度が低いものは70未満
- is_housing_relatedは住宅・不動産・建築・ハウスメーカー・ビルダーに直接関連する記事ならtrue`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Gemini response as JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]) as SummaryResult;

  // Validate required fields
  if (!parsed.summary || parsed.summary.length < 10) {
    throw new Error('Summary too short or missing');
  }
  if (!VALID_CATEGORIES.includes(parsed.category)) {
    parsed.category = '市場動向'; // fallback
  }
  if (!VALID_TYPES.includes(parsed.article_type)) {
    parsed.article_type = '業界'; // fallback
  }
  if (typeof parsed.confidence_score !== 'number') {
    parsed.confidence_score = 50;
  }
  if (typeof parsed.is_housing_related !== 'boolean') {
    parsed.is_housing_related = true;
  }
  if (!parsed.expert_opinion) {
    parsed.expert_opinion = '';
  }
  if (!Array.isArray(parsed.related_companies)) {
    parsed.related_companies = [];
  }

  return parsed;
}
