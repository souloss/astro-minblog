import type { AiChatEvent, TelegramTemplate, WebhookPayload, EmailTemplate } from '../types.js';
import { escapeHtml, sanitizeUrl } from '../utils.js';

function anonymizeSessionId(sessionId: string): string {
  if (!sessionId || sessionId.length <= 6) return sessionId;
  return `${sessionId.slice(0, 4)}***${sessionId.slice(-2)}`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function telegramTemplate(event: AiChatEvent): TelegramTemplate {
  const userMsg = event.userMessage.length > 150 
    ? event.userMessage.slice(0, 150) + '...' 
    : event.userMessage;

  const sessionIdDisplay = anonymizeSessionId(event.sessionId);
  const timestamp = event.timestamp ? formatDate(event.timestamp) : formatDate(new Date());

  const lines: string[] = [
    `🗣 <b>博客 AI 对话</b>`,
    ``,
    `👤 ${sessionIdDisplay} · 🕐 ${timestamp} · 第 ${event.roundNumber} 轮`,
    ``,
    `❓ <b>读者:</b>`,
    `<i>「${escapeHtml(userMsg)}」</i>`,
  ];

  if (event.aiResponse) {
    const aiMsg = event.aiResponse.length > 200 
      ? event.aiResponse.slice(0, 200) + '...' 
      : event.aiResponse;
    lines.push(``, `💬 <b>AI:</b>`, escapeHtml(aiMsg));
  }

  if (event.referencedArticles?.length) {
    lines.push(``, `📎 <b>引用文章:</b>`);
    event.referencedArticles.slice(0, 5).forEach(article => {
      if (article.url) {
        lines.push(`  · <a href="${sanitizeUrl(article.url)}">${escapeHtml(article.title)}</a>`);
      } else {
        lines.push(`  · ${escapeHtml(article.title)}`);
      }
    });
  }

  if (event.model) {
    lines.push(``, `⚙️ <b>模型配置:</b>`);
    if (event.model.apiHost) {
      lines.push(`  · API Host: ${escapeHtml(event.model.apiHost)}`);
    }
    lines.push(`  · 主对话模型: ${escapeHtml(event.model.name)}`);
    if (event.model.provider) {
      lines.push(`  · Provider: ${escapeHtml(event.model.provider)}`);
    }
  }

  if (event.usage) {
    lines.push(``, `🧮 <b>Token 用量:</b>`);
    lines.push(`  · 本次请求合计: 总 ${event.usage.total} / 入 ${event.usage.input} / 出 ${event.usage.output}`);
  }

  if (event.timing) {
    lines.push(``, `⏱️ <b>阶段耗时:</b>`);
    lines.push(`  · 总耗时: ${formatTime(event.timing.total)}`);
    if (event.timing.keywordExtraction) {
      lines.push(`  · 关键词提取: ${formatTime(event.timing.keywordExtraction)}`);
    }
    if (event.timing.search) {
      lines.push(`  · 检索执行: ${formatTime(event.timing.search)}`);
    }
    if (event.timing.evidenceAnalysis) {
      lines.push(`  · 证据分析: ${formatTime(event.timing.evidenceAnalysis)}`);
    }
    if (event.timing.generation) {
      lines.push(`  · 文本生成: ${formatTime(event.timing.generation)}`);
    }
  }

  if (event.siteUrl) {
    lines.push(``, `🔗 <a href="${sanitizeUrl(event.siteUrl)}">访问网站</a>`);
  }

  return {
    text: lines.join('\n'),
    parse_mode: 'HTML',
  };
}

export function webhookPayload(event: AiChatEvent): WebhookPayload {
  return {
    event: 'ai-chat',
    timestamp: event.timestamp?.toISOString() ?? new Date().toISOString(),
    data: {
      sessionId: event.sessionId,
      sessionIdAnonymized: anonymizeSessionId(event.sessionId),
      roundNumber: event.roundNumber,
      userMessage: event.userMessage,
      aiResponse: event.aiResponse,
      referencedArticles: event.referencedArticles,
      model: event.model,
      usage: event.usage,
      timing: event.timing,
      siteUrl: event.siteUrl,
    },
  };
}

export function emailTemplate(event: AiChatEvent): EmailTemplate {
  const userMsg = event.userMessage.length > 300 
    ? event.userMessage.slice(0, 300) + '...' 
    : event.userMessage;

  const sessionIdDisplay = anonymizeSessionId(event.sessionId);
  const timestamp = event.timestamp ? formatDate(event.timestamp) : formatDate(new Date());

  const articlesHtml = event.referencedArticles?.length ? `
    <div class="section">
      <div class="section-title">📎 引用文章</div>
      <div class="content">
        ${event.referencedArticles.slice(0, 5).map(a => 
          a.url ? `<a href="${sanitizeUrl(a.url)}">${escapeHtml(a.title)}</a>` : escapeHtml(a.title)
        ).join('<br>')}
      </div>
    </div>
  ` : '';

  const modelHtml = event.model ? `
    <div class="section">
      <div class="section-title">⚙️ 模型配置</div>
      <div class="content meta-grid">
        ${event.model.apiHost ? `<span>API Host: ${escapeHtml(event.model.apiHost)}</span>` : ''}
        <span>模型: ${escapeHtml(event.model.name)}</span>
        ${event.model.provider ? `<span>Provider: ${escapeHtml(event.model.provider)}</span>` : ''}
      </div>
    </div>
  ` : '';

  const usageHtml = event.usage ? `
    <div class="section">
      <div class="section-title">🧮 Token 用量</div>
      <div class="content meta-grid">
        <span>总计: ${event.usage.total}</span>
        <span>输入: ${event.usage.input}</span>
        <span>输出: ${event.usage.output}</span>
      </div>
    </div>
  ` : '';

  const timingHtml = event.timing ? `
    <div class="section">
      <div class="section-title">⏱️ 阶段耗时</div>
      <div class="content meta-grid">
        <span>总耗时: ${formatTime(event.timing.total)}</span>
        ${event.timing.keywordExtraction ? `<span>关键词提取: ${formatTime(event.timing.keywordExtraction)}</span>` : ''}
        ${event.timing.search ? `<span>检索: ${formatTime(event.timing.search)}</span>` : ''}
        ${event.timing.generation ? `<span>生成: ${formatTime(event.timing.generation)}</span>` : ''}
      </div>
    </div>
  ` : '';

  return {
    subject: `🗣 博客 AI 对话 - 第 ${event.roundNumber} 轮`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
    .meta-header { font-size: 13px; color: #666; }
    .section { margin: 16px 0; }
    .section-title { font-weight: 600; color: #555; font-size: 14px; margin-bottom: 8px; }
    .content { background: #f9f9f9; padding: 16px; border-radius: 8px; }
    .user-msg { border-left: 3px solid #007bff; padding-left: 12px; }
    .ai-msg { border-left: 3px solid #28a745; padding-left: 12px; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px; }
    .meta-grid span { padding: 4px 8px; background: #eee; border-radius: 4px; }
    .link { display: inline-block; background: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">🗣 博客 AI 对话</h1>
    <p class="meta-header">👤 ${sessionIdDisplay} · 🕐 ${timestamp} · 第 ${event.roundNumber} 轮</p>
  </div>
  <div class="section">
    <div class="section-title">❓ 读者提问</div>
    <div class="content user-msg">${escapeHtml(userMsg)}</div>
  </div>
  ${event.aiResponse ? `
  <div class="section">
    <div class="section-title">💬 AI 回复</div>
    <div class="content ai-msg">${escapeHtml(event.aiResponse.slice(0, 400))}${event.aiResponse.length > 400 ? '...' : ''}</div>
  </div>
  ` : ''}
  ${articlesHtml}
  ${modelHtml}
  ${usageHtml}
  ${timingHtml}
  ${event.siteUrl ? `<a href="${sanitizeUrl(event.siteUrl)}" class="link">访问网站</a>` : ''}
</body>
</html>`,
    text: `博客 AI 对话

👤 ${sessionIdDisplay} · 🕐 ${timestamp} · 第 ${event.roundNumber} 轮

❓ 读者提问:
${userMsg}

${event.aiResponse ? `💬 AI 回复:\n${event.aiResponse.slice(0, 400)}\n` : ''}
${event.referencedArticles?.length ? `📎 引用文章:\n${event.referencedArticles.map(a => `  · ${a.title}`).join('\n')}\n` : ''}
${event.model ? `⚙️ 模型: ${event.model.name}${event.model.provider ? ` @ ${event.model.provider}` : ''}\n` : ''}
${event.usage ? `🧮 Token: 总 ${event.usage.total} / 入 ${event.usage.input} / 出 ${event.usage.output}\n` : ''}
${event.timing ? `⏱️ 耗时: ${formatTime(event.timing.total)}\n` : ''}`,
  };
}


function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}