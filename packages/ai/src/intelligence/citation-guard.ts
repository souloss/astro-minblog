import type { ArticleContext, ProjectContext } from '../search/types.js';
import type { CitationGuardPreflight, CitationGuardAction } from './types.js';
import {
  PRIVACY_REFUSAL_TEMPLATES,
  NO_ARTICLE_TEMPLATES,
  ARTICLE_COUNT_TEMPLATES,
  UNKNOWN_REFUSAL_TEMPLATES,
  pickTemplate,
  pickTemplateWithVars,
} from './response-templates.js';

export type AnswerMode = 'fact' | 'count' | 'list' | 'opinion' | 'recommendation' | 'unknown' | 'general';

// Precise Chinese phrases to avoid false positives (e.g., "age" matching "Pages", "package")
const PRIVACY_PATTERNS = [
  /具体住在哪|哪个小区|门牌号|家庭住址|具体地址|住址信息/u,
  /赚多少钱|月收入|年收入|工资多少|薪资多少|收入多少/u,
  /老婆叫什么|妻子叫什么|丈夫叫什么|孩子叫什么|父母叫什么|家人姓名/u,
  /手机号码|电话号码|联系方式|微信号|QQ号/u,
  /身份证号|护照号|证件号/u,
  /你多大了|你几岁|年龄多大|今年多大|今年几岁/u,
];

function hasPrivacyIntent(query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  return PRIVACY_PATTERNS.some(pattern => pattern.test(normalized));
}

export function resolveAnswerMode(query: string): AnswerMode {
  const q = query.toLowerCase();
  if (hasPrivacyIntent(query)) return 'unknown';
  if (/几次|多少|几篇|数量|count|how many/u.test(q)) return 'count';
  if (/哪些|哪几个|列表|列举|list|what are/u.test(q)) return 'list';
  if (/怎么看|怎么想|看法|观点|opinion|think about/u.test(q)) return 'opinion';
  if (/推荐|建议|suggest|recommend/u.test(q)) return 'recommendation';
  if (/是什么|什么是|介绍|解释|what is|explain/u.test(q)) return 'fact';
  if (/有没有|是否|是不是|真的吗|does|is there/u.test(q)) return 'fact';
  return 'general';
}

export function buildUnknownRefusal(query: string, lang: string = 'zh'): string {
  const normalized = query.trim().toLowerCase();
  
  if (/(具体住在哪|哪个小区|门牌号|家庭住址|具体地址|住址)/u.test(normalized)) {
    return pickTemplate(PRIVACY_REFUSAL_TEMPLATES.address, lang);
  }
  if (/(赚多少钱|月收入|年收入|工资多少|薪资多少|收入)/u.test(normalized)) {
    return pickTemplate(PRIVACY_REFUSAL_TEMPLATES.income, lang);
  }
  if (/(老婆叫什么|妻子叫什么|丈夫叫什么|孩子叫什么|父母叫什么|家人姓名|家人)/u.test(normalized)) {
    return pickTemplate(PRIVACY_REFUSAL_TEMPLATES.family, lang);
  }
  if (/(手机号码|电话号码|联系方式|微信号|QQ号|电话|手机)/u.test(normalized)) {
    return pickTemplate(PRIVACY_REFUSAL_TEMPLATES.phone, lang);
  }
  if (/(身份证号|护照号|证件号|身份证)/u.test(normalized)) {
    return pickTemplate(PRIVACY_REFUSAL_TEMPLATES.id, lang);
  }
  if (/(你多大了|你几岁|年龄多大|今年多大|今年几岁|年龄)/u.test(normalized)) {
    return pickTemplate(PRIVACY_REFUSAL_TEMPLATES.age, lang);
  }
  
  return pickTemplate(UNKNOWN_REFUSAL_TEMPLATES, lang);
}

export function getCitationGuardPreflight(params: {
  userQuery: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  lang?: string;
}): CitationGuardPreflight | null {
  const { userQuery, articles, projects, lang = 'zh' } = params;
  const q = userQuery.toLowerCase();

  // Privacy queries handled by resolveAnswerMode -> buildUnknownRefusal (no early interception)
  
  if (/有几篇|有多少篇|文章数量|总共.*文章|how many.*article/u.test(q)) {
    const total = articles.length;
    if (total > 0) {
      const text = pickTemplateWithVars(ARTICLE_COUNT_TEMPLATES, lang, { count: total });
      return { text, actions: ['preflight_reject'] };
    }
  }

  if (/有没有|是否有|有.*文章|写过.*吗|is there|any.*article/u.test(q)) {
    if (articles.length === 0 && projects.length === 0) {
      const text = pickTemplate(NO_ARTICLE_TEMPLATES, lang);
      return { text, actions: ['preflight_reject'] };
    }
  }

  return null;
}

export function createCitationGuardTransform(params: {
  articles: ArticleContext[];
  projects: ProjectContext[];
  siteUrl?: string;
  onApplied?: (result: { actions: CitationGuardAction[] }) => void;
}): (stream: ReadableStream<string>) => ReadableStream<string> {
  const { articles, projects, siteUrl = '', onApplied } = params;

  const normalizeUrl = (url: string): string => {
    if (url.startsWith('/')) return `${siteUrl}${url}`;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${siteUrl}/${url}`;
  };

  const validUrls = new Set([
    ...articles.map(a => normalizeUrl(a.url)),
    ...projects.map(p => normalizeUrl(p.url)),
  ]);

  const isValidInternalUrl = (url: string): boolean => {
    if (url.startsWith('/') && !url.startsWith('//')) return true;
    if (siteUrl && url.startsWith(siteUrl)) return true;
    return validUrls.has(normalizeUrl(url));
  };

  return (stream: ReadableStream<string>) => {
    const actions: CitationGuardAction[] = [];
    let buffer = '';

    const transform = new TransformStream<string, string>({
      transform(chunk, controller) {
        buffer += chunk;

        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match: RegExpExecArray | null;
        let lastIndex = 0;
        let output = '';

        while ((match = linkPattern.exec(buffer)) !== null) {
          const [fullMatch, text, url] = match;
          output += buffer.slice(lastIndex, match.index);

          const normalizedUrl = normalizeUrl(url);
          const isExternal = url.startsWith('http://') || url.startsWith('https://');
          const isInternalValid = isValidInternalUrl(url);
          const isInValidList = validUrls.has(normalizedUrl);

          if (isExternal && !isInValidList && !isInternalValid) {
            output += text;
            actions.push('stream_rewrite');
          } else {
            output += fullMatch;
          }

          lastIndex = match.index + fullMatch.length;
        }

        buffer = buffer.slice(lastIndex);
        if (output) {
          controller.enqueue(output);
        }
      },
      flush(controller) {
        if (buffer) {
          controller.enqueue(buffer);
          buffer = '';
        }
        if (actions.length > 0) {
          onApplied?.({ actions });
        }
      },
    });

    return stream.pipeThrough(transform);
  };
}