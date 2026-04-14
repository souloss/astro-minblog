import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "fact",
  "list",
  "count",
  "timeline",
  "recommendation",
  "opinion",
  "mixed",
  "unknown",
]);

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);

export const CountModeSchema = z.enum(["exact", "at_least", "unknown"]);

export const EvidenceEntitySchema = z.object({
  name: z.string(),
  relation: z.string(),
  status: z.string(),
  count: z.number().int().positive().optional(),
  countMode: CountModeSchema.optional(),
  note: z.string().optional(),
  evidenceUrls: z.array(z.string()),
});

export const EvidenceFindingSchema = z.object({
  claim: z.string(),
  confidence: ConfidenceLevelSchema,
  evidenceUrls: z.array(z.string()),
});

export const EvidenceAnalysisSchema = z.object({
  questionType: QuestionTypeSchema,
  directAnswer: z.string(),
  entities: z.array(EvidenceEntitySchema).max(6),
  keyFindings: z.array(EvidenceFindingSchema).max(4),
  uncertainties: z.array(z.string()).max(6),
  recommendedUrls: z.array(z.string()).max(3),
});

export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;
export type CountMode = z.infer<typeof CountModeSchema>;
export type EvidenceEntity = z.infer<typeof EvidenceEntitySchema>;
export type EvidenceFinding = z.infer<typeof EvidenceFindingSchema>;
export type EvidenceAnalysis = z.infer<typeof EvidenceAnalysisSchema>;

export const EVIDENCE_ANALYSIS_SYSTEM_PROMPT = `你是检索证据分析器。把 evidence pack 整理成 JSON 结论，不写最终回答。

规则：
- 只用 evidence pack 中的事实，禁止补充
- 只输出 JSON，不要 Markdown
- evidenceUrls 必须逐字用 evidence pack 给出的完整 URL
- 证据不足时用 uncertainties 说明，不要硬猜
- 聚合类问题（去过/读过/跑过几次）：去重、区分 visited/planned/mentioned
- 同一事件多篇文章不等于多次
- countMode 优先 at_least 或 unknown，除非证据明确写了总数
- entities≤6 note简短；keyFindings≤4；recommendedUrls≤3

输出JSON格式：
{
  "questionType": "fact|list|count|timeline|recommendation|opinion|mixed|unknown",
  "directAnswer": "一句话结论",
  "entities": [{"name":"","relation":"","status":"","count":2,"countMode":"exact|at_least|unknown","note":"","evidenceUrls":[]}],
  "keyFindings": [{"claim":"","confidence":"high|medium|low","evidenceUrls":[]}],
  "uncertainties": [],
  "recommendedUrls": []
}`;
