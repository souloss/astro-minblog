import { tool } from 'ai';
import { z } from 'zod';
import { searchArticles, searchProjects } from '../search/search-api.js';

export const toggleThemeTool = tool({
  description: 'Toggle the blog theme between light, dark, and system modes. Use this when the user wants to change the visual theme of the blog.',
  inputSchema: z.object({
    theme: z.enum(['light', 'dark', 'system']).describe('The theme to switch to: "light" for bright mode, "dark" for dark mode, "system" to follow system preference'),
  }),
});

export const navigateToArticleTool = tool({
  description: 'Navigate to a specific blog article by its slug. Use this when the user wants to open or jump to a specific article.',
  inputSchema: z.object({
    slug: z.string().describe('The URL slug of the article to navigate to (e.g., "ai-module-architecture")'),
    sectionId: z.string().optional().describe('Optional: The section ID to scroll to after navigation (e.g., "三系统架构设计")'),
    lang: z.enum(['zh', 'en']).optional().describe('Optional: The language of the article (defaults to "zh")'),
  }),
});

export const scrollToSectionTool = tool({
  description: 'Scroll to a specific section within the current article. Use this when the user wants to jump to a chapter or section.',
  inputSchema: z.object({
    sectionId: z.string().describe('The ID of the section to scroll to (e.g., "三系统架构设计" or "chapter-3")'),
    highlight: z.boolean().optional().describe('Whether to highlight the section after scrolling (default: true)'),
    behavior: z.enum(['smooth', 'instant']).optional().describe('Scroll behavior (default: "smooth")'),
  }),
});

export const toggleReadingModeTool = tool({
  description: 'Toggle reading mode on or off. Reading mode provides a distraction-free reading experience with larger text and optimized layout.',
  inputSchema: z.object({
    enabled: z.boolean().optional().describe('Whether to enable (true) or disable (false) reading mode. If not specified, toggles the current state.'),
    fontSize: z.enum(['sm', 'md', 'lg', 'xl']).optional().describe('Font size for reading mode'),
    fontFamily: z.string().optional().describe('Font family for reading mode'),
  }),
});

export const highlightTextTool = tool({
  description: 'Highlight specific text in the article. Use this when the user wants to emphasize or mark text.',
  inputSchema: z.object({
    text: z.string().optional().describe('The text content to highlight'),
    selector: z.string().optional().describe('CSS selector for the element to highlight'),
    style: z.enum(['accent', 'warning', 'info', 'success']).optional().describe('Highlight style (default: "accent")'),
    duration: z.number().optional().describe('Duration in milliseconds for the highlight effect (default: 3000, 0 for permanent)'),
    scrollIntoView: z.boolean().optional().describe('Whether to scroll the highlighted element into view'),
  }),
});

export const setPreferenceTool = tool({
  description: 'Set a user preference value. Use this when the user wants to customize their experience.',
  inputSchema: z.object({
    key: z.string().describe('The preference key (e.g., "theme", "reading.fontSize")'),
    value: z.unknown().describe('The value to set'),
  }),
});

interface SearchResultItem {
  title: string;
  url: string;
  excerpt: string;
  categories: string[];
  tags: string[];
  keyPoints: string[];
  dateTime: number;
  lang: string;
  score?: number;
}

export const searchArticlesTool = tool({
  description: 'Search for blog articles and projects matching a query. Use this when the user wants to find specific content or when they ask to navigate to a topic (e.g., "AI module", "architecture"). Returns matching articles with titles, URLs, and summaries.',
  inputSchema: z.object({
    query: z.string().describe('The search query (keywords or topic)'),
    limit: z.number().optional().default(5).describe('Maximum number of results to return (default: 5)'),
    includeProjects: z.boolean().optional().default(true).describe('Whether to include projects in search results'),
  }),
  execute: async ({ query, limit, includeProjects }): Promise<{ articles: SearchResultItem[]; projects: { name: string; url: string; description: string }[] }> => {
    const articles = searchArticles(query);
    const projects = includeProjects ? searchProjects(query) : [];
    
    return {
      articles: articles.slice(0, limit ?? 5).map(a => ({
        title: a.title,
        url: a.url,
        excerpt: a.summary?.slice(0, 200) ?? '',
        categories: a.categories ?? [],
        tags: [],
        keyPoints: a.keyPoints ?? [],
        dateTime: a.dateTime,
        lang: 'zh',
        score: a.score,
      })),
      projects: projects.slice(0, 3).map(p => ({
        name: p.name,
        url: p.url,
        description: p.description?.slice(0, 200) ?? '',
      })),
    };
  },
});

const builtinTools = {
  toggleTheme: toggleThemeTool,
  navigateToArticle: navigateToArticleTool,
  scrollToSection: scrollToSectionTool,
  toggleReadingMode: toggleReadingModeTool,
  highlightText: highlightTextTool,
  setPreference: setPreferenceTool,
  searchArticles: searchArticlesTool,
};

type AnyTool = typeof builtinTools[keyof typeof builtinTools];
const customTools: Record<string, AnyTool> = {};

export function registerTool(name: string, definition: AnyTool): void {
  customTools[name] = definition;
}

export function unregisterTool(name: string): void {
  delete customTools[name];
}

export function getAllTools(): Record<string, AnyTool> {
  return { ...builtinTools, ...customTools };
}

export const allTools = getAllTools();

export type ToolName = string;

const BUILTIN_CLIENT_TOOLS = ['toggleTheme', 'navigateToArticle', 'scrollToSection', 'toggleReadingMode', 'highlightText', 'setPreference'];
const BUILTIN_SERVER_TOOLS = ['searchArticles'];

export function getClientSideTools(): string[] {
  return [...BUILTIN_CLIENT_TOOLS, ...Object.keys(customTools).filter(k => !(customTools[k] as { execute?: unknown }).execute)];
}

export function getServerSideTools(): string[] {
  return [...BUILTIN_SERVER_TOOLS, ...Object.keys(customTools).filter(k => !!(customTools[k] as { execute?: unknown }).execute)];
}