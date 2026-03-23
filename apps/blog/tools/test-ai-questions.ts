#!/usr/bin/env npx tsx
/**
 * AI Questions Testing Tool
 * 
 * Tests the AI server with questions from user-questions-taxonomy.json
 * and saves Q&A results for evaluation.
 * 
 * Usage:
 *   npx tsx tools/test-ai-questions.ts [options]
 * 
 * Options:
 *   --limit=N        Limit total questions (default: 50)
 *   --category=NAME  Test only specific category
 *   --delay=MS       Delay between requests in ms (default: 1000)
 *   --output=FILE    Output file (default: datas/qa-test-results.jsonl)
 *   --dry-run        Show what would be tested without making requests
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Question {
  q: string;
  lang: string;
  answerMode: string;
  context?: string;
  mustHaveLinks?: boolean;
  forbidden?: boolean;
  forbiddenClaims?: string[];
}

interface CategoryQuestions {
  [subcategory: string]: Question[];
}

interface TaxonomyData {
  categories: Record<string, { id: string; name: string; nameEn: string; description: string; subcategories: string[] }>;
  questions: Record<string, CategoryQuestions>;
}

interface TestResult {
  id: string;
  category: string;
  subcategory: string;
  question: string;
  lang: string;
  answerMode: string;
  response: string;
  latencyMs: number;
  sources: string[];
  success: boolean;
  error?: string;
  timestamp: string;
}

const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string): string => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit', '50'), 10);
const CATEGORY_FILTER = getArg('category', '');
const DELAY_MS = parseInt(getArg('delay', '1000'), 10);
const OUTPUT_FILE = getArg('output', 'datas/qa-test-results.jsonl');
const DRY_RUN = hasFlag('dry-run');

const TAXONOMY_PATH = path.join(__dirname, '../datas/user-questions-taxonomy.json');
const API_URL = 'http://localhost:8787/api/chat';

function readTaxonomy(): TaxonomyData {
  const content = fs.readFileSync(TAXONOMY_PATH, 'utf-8');
  return JSON.parse(content);
}

function sampleQuestions(taxonomy: TaxonomyData, limit: number, categoryFilter: string): Array<{category: string; subcategory: string; question: Question}> {
  const sampled: Array<{category: string; subcategory: string; question: Question}> = [];
  const categories = Object.keys(taxonomy.questions);
  
  const targetCategories = categoryFilter 
    ? categories.filter(c => c === categoryFilter)
    : categories;
  
  const questionsPerCategory = Math.ceil(limit / targetCategories.length);
  
  for (const category of targetCategories) {
    const subcategories = taxonomy.questions[category];
    if (!subcategories) continue;
    
    const subcatKeys = Object.keys(subcategories);
    const questionsPerSubcat = Math.max(1, Math.ceil(questionsPerCategory / subcatKeys.length));
    
    for (const subcategory of subcatKeys) {
      const questions = subcategories[subcategory] || [];
      const sampledFromSubcat = questions
        .filter(q => !q.forbidden)
        .slice(0, questionsPerSubcat);
      
      for (const question of sampledFromSubcat) {
        sampled.push({ category, subcategory, question });
      }
    }
  }
  
  return shuffleArray(sampled).slice(0, limit);
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function sendChatRequest(question: string, lang: string): Promise<{response: string; sources: string[]; latencyMs: number}> {
  const startTime = Date.now();
  
  const requestBody = {
    messages: [{
      id: `test-${Date.now()}`,
      role: 'user',
      parts: [{ type: 'text', text: question }]
    }],
    context: { scope: 'global' },
    lang: lang
  };
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const text = await response.text();
  const { content, sources } = parseSSEResponse(text);
  
  return {
    response: content,
    sources,
    latencyMs: Date.now() - startTime
  };
}

function parseSSEResponse(text: string): { content: string; sources: string[] } {
  const lines = text.split('\n');
  let content = '';
  const sources: string[] = [];
  
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    
    try {
      const data = JSON.parse(line.slice(6));
      
      if (data.type === 'text-delta') {
        content += data.delta || '';
      } else if (data.type === 'source-url') {
        sources.push(data.url || data.title || '');
      }
    } catch {
      // intentionally empty - skip malformed SSE lines
    }
  }
  
  return { content, sources };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== AI Questions Testing Tool ===\n');
  
  const taxonomy = readTaxonomy();
  console.log(`Loaded taxonomy with ${Object.keys(taxonomy.questions).length} categories`);
  
  const sampledQuestions = sampleQuestions(taxonomy, LIMIT, CATEGORY_FILTER);
  console.log(`Sampled ${sampledQuestions.length} questions for testing`);
  
  if (CATEGORY_FILTER) {
    console.log(`Category filter: ${CATEGORY_FILTER}`);
  }
  
  if (DRY_RUN) {
    console.log('\n[DRY RUN] Questions to be tested:');
    sampledQuestions.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.category}/${item.subcategory}] ${item.question.q}`);
    });
    console.log(`\nTotal: ${sampledQuestions.length} questions`);
    return;
  }
  
  const outputPath = path.join(__dirname, '..', OUTPUT_FILE);
  fs.writeFileSync(outputPath, '');
  
  const results: TestResult[] = [];
  let successCount = 0;
  let errorCount = 0;
  
  console.log(`\nStarting tests (delay: ${DELAY_MS}ms between requests)...\n`);
  
  for (let i = 0; i < sampledQuestions.length; i++) {
    const item = sampledQuestions[i];
    const progress = `[${i + 1}/${sampledQuestions.length}]`;
    
    process.stdout.write(`${progress} [${item.category}] ${item.question.q.slice(0, 40)}... `);
    
    try {
      const result = await sendChatRequest(item.question.q, item.question.lang);
      
      const testResult: TestResult = {
        id: `q-${i + 1}`,
        category: item.category,
        subcategory: item.subcategory,
        question: item.question.q,
        lang: item.question.lang,
        answerMode: item.question.answerMode,
        response: result.response,
        latencyMs: result.latencyMs,
        sources: result.sources,
        success: true,
        timestamp: new Date().toISOString()
      };
      
      fs.appendFileSync(outputPath, JSON.stringify(testResult) + '\n');
      results.push(testResult);
      successCount++;
      
      console.log(`✓ (${result.latencyMs}ms)`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      const testResult: TestResult = {
        id: `q-${i + 1}`,
        category: item.category,
        subcategory: item.subcategory,
        question: item.question.q,
        lang: item.question.lang,
        answerMode: item.question.answerMode,
        response: '',
        latencyMs: 0,
        sources: [],
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString()
      };
      
      fs.appendFileSync(outputPath, JSON.stringify(testResult) + '\n');
      results.push(testResult);
      errorCount++;
      
      console.log(`✗ ${errorMsg}`);
    }
    
    if (i < sampledQuestions.length - 1) {
      await sleep(DELAY_MS);
    }
  }
  
  const summary = {
    total: sampledQuestions.length,
    success: successCount,
    errors: errorCount,
    avgLatencyMs: Math.round(results.filter(r => r.success).reduce((sum, r) => sum + r.latencyMs, 0) / successCount) || 0,
    byCategory: {} as Record<string, { total: number; success: number; errors: number }>,
    timestamp: new Date().toISOString()
  };
  
  for (const result of results) {
    if (!summary.byCategory[result.category]) {
      summary.byCategory[result.category] = { total: 0, success: 0, errors: 0 };
    }
    summary.byCategory[result.category].total++;
    if (result.success) {
      summary.byCategory[result.category].success++;
    } else {
      summary.byCategory[result.category].errors++;
    }
  }
  
  const summaryPath = path.join(__dirname, '..', 'datas/qa-test-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\n=== Test Summary ===');
  console.log(`Total questions: ${summary.total}`);
  console.log(`Success: ${summary.success}`);
  console.log(`Errors: ${summary.errors}`);
  console.log(`Average latency: ${summary.avgLatencyMs}ms`);
  console.log(`\nResults saved to: ${outputPath}`);
  console.log(`Summary saved to: ${summaryPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});