import type {
  CommentEvent,
  TelegramTemplate,
  WebhookPayload,
  EmailTemplate,
} from "../types.js";
import { escapeHtml, sanitizeUrl } from "../utils.js";

export function telegramTemplate(event: CommentEvent): TelegramTemplate {
  const content =
    event.content.length > 200
      ? event.content.slice(0, 200) + "..."
      : event.content;

  return {
    text: `💬 <b>新评论</b>

📖 文章：${escapeHtml(event.postTitle)}
👤 评论者：${escapeHtml(event.author)}

<i>「${escapeHtml(content)}」</i>

🔗 <a href="${sanitizeUrl(event.postUrl)}">查看评论</a>`,
    parse_mode: "HTML",
  };
}

export function webhookPayload(event: CommentEvent): WebhookPayload {
  return {
    event: "comment",
    timestamp: event.timestamp?.toISOString() ?? new Date().toISOString(),
    data: {
      author: event.author,
      content: event.content,
      postTitle: event.postTitle,
      postUrl: event.postUrl,
    },
  };
}

export function emailTemplate(event: CommentEvent): EmailTemplate {
  const content =
    event.content.length > 500
      ? event.content.slice(0, 500) + "..."
      : event.content;

  return {
    subject: `💬 新评论 - ${event.postTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
    .meta { font-size: 14px; color: #666; }
    .content { background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .quote { font-style: italic; color: #555; }
    .link { display: inline-block; background: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">💬 新评论</h1>
    <p class="meta">文章：<a href="${sanitizeUrl(event.postUrl)}">${escapeHtml(event.postTitle)}</a></p>
  </div>
  <p><strong>评论者：</strong>${escapeHtml(event.author)}</p>
  <div class="content">
    <p class="quote">"${escapeHtml(content)}"</p>
  </div>
  <a href="${sanitizeUrl(event.postUrl)}" class="link">查看评论</a>
  <div class="footer">
    <p>此邮件由您的博客通知系统发送</p>
  </div>
</body>
</html>`,
    text: `新评论

文章：${event.postTitle}
评论者：${event.author}

"${content}"

查看评论：${event.postUrl}`,
  };
}
