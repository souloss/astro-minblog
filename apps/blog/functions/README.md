# Cloudflare Pages Functions

Thin adapter layer for Cloudflare Pages deployment. Core logic lives in `@astro-minimax/ai/server` and `@astro-minimax/notify`.

## Structure

```
functions/
  api/
    chat.ts           → AI chat endpoint
    ai-info.ts        → Provider status endpoint
    notify/
      comment.ts      → Comment notification webhook (for Waline)
      status.ts       → Notification config status endpoint
```

## Local Development

```bash
pnpm run dev
```

## Environment Variables

Configure in `.env` (local) or Cloudflare Dashboard (production):

### AI Configuration

| Variable          | Description                                    |
| ----------------- | ---------------------------------------------- |
| `AI_BASE_URL`     | OpenAI-compatible API base URL                 |
| `AI_API_KEY`      | API key                                        |
| `AI_MODEL`        | Model name                                     |
| `AI_BINDING_NAME` | Workers AI binding name (default: `minimaxAI`) |
| `SITE_AUTHOR`     | Author name for AI prompts                     |
| `SITE_URL`        | Site URL for article links                     |

The AI endpoints initialize runtime data from `datas/rag-bundle.json` and optionally use vector data embedded in that bundle.

### Notification Configuration

| Variable                    | Description                            |
| --------------------------- | -------------------------------------- |
| `NOTIFY_TELEGRAM_BOT_TOKEN` | Telegram bot token (from @BotFather)   |
| `NOTIFY_TELEGRAM_CHAT_ID`   | Telegram chat ID (from @userinfobot)   |
| `NOTIFY_RESEND_API_KEY`     | Resend API key for email notifications |
| `NOTIFY_RESEND_FROM`        | Email sender address                   |
| `NOTIFY_RESEND_TO`          | Email recipient address                |
| `NOTIFY_WEBHOOK_URL`        | Custom webhook URL (optional)          |

## Deployment

For monorepo deployment, set **Root directory** to `apps/blog` in Cloudflare Pages project settings.

```bash
pnpm run build
npx wrangler pages deploy dist --project-name=your-project-name
```

Workers AI binding is configured in `wrangler.toml`:

```toml
[ai]
binding = "minimaxAI"
```

## Notification Setup

### Waline Webhook

1. In Waline deployment, set `WEBHOOK` environment variable to:

   ```
   https://your-domain.com/api/notify/comment
   ```

2. Configure notification providers in Cloudflare Dashboard

3. Test with:
   ```bash
   curl https://your-domain.com/api/notify/status
   ```
