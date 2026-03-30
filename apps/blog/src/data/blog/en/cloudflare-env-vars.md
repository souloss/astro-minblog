---
title: "Configuring Environment Variables in Cloudflare Pages"
pubDatetime: 2026-03-18T00:00:00.000Z
modDatetime: 2026-03-30T00:00:00.000Z
author: Souloss
description: "A step-by-step guide to configuring environment variables in Cloudflare Pages Dashboard for astro-minimax features including AI chat, notifications, and build settings."
tags:
  - docs
  - cloudflare
  - deployment
  - configuration
category: Tutorial/Deployment
featured: false
draft: false
---

This guide explains how to configure environment variables in Cloudflare Pages Dashboard for astro-minimax. Proper environment variable configuration is essential for AI chat, notification systems, and build processes to function correctly.

## Overview

### Why Environment Variables Matter

Environment variables in astro-minimax serve three primary purposes:

| Purpose               | Description                 | Examples                    |
| --------------------- | --------------------------- | --------------------------- |
| Build Configuration   | Control build-time behavior | `NODE_VERSION`              |
| Runtime Secrets       | Secure credential storage   | API keys, tokens            |
| Feature Configuration | Enable optional features    | AI providers, notifications |

### Build-time vs Runtime Variables

Understanding when variables are accessed is crucial:

**Build-time Variables** are used during the build process. Changes require a new deployment to take effect.

| Variable          | Used At | Effect of Change  |
| ----------------- | ------- | ----------------- |
| `NODE_VERSION`    | Build   | Requires redeploy |

**Runtime Variables** are accessed when the application runs. Changes take effect on the next request without redeployment.

| Variable                    | Used At | Effect of Change |
| --------------------------- | ------- | ---------------- |
| `AI_BINDING_NAME`           | Runtime | Immediate        |
| `AI_API_KEY`                | Runtime | Immediate        |
| `NOTIFY_TELEGRAM_BOT_TOKEN` | Runtime | Immediate        |
| `NOTIFY_RESEND_API_KEY`     | Runtime | Immediate        |

## Accessing Environment Variables

Navigate to the Cloudflare Pages environment variables settings:

```
Cloudflare Dashboard → Workers & Pages → [your-project] → Settings → Environment variables
```

### Environment Scopes

Cloudflare Pages provides two environment scopes:

| Scope      | Description                          | Use Case              |
| ---------- | ------------------------------------ | --------------------- |
| Production | Variables for production deployments | API keys, live tokens |
| Preview    | Variables for preview deployments    | Test tokens, dev keys |

> [!TIP]
> Use different API keys for production and preview environments to isolate testing from production data.

## Required Variables

These variables are essential for astro-minimax to function properly.

### Build Configuration

| Variable       | Value | Required | Description                                                           |
| -------------- | ----- | -------- | --------------------------------------------------------------------- |
| `NODE_VERSION` | `22`  | Yes      | Node.js version for build. Use Node.js 22 LTS for best compatibility. |

### AI Configuration

| Variable          | Default     | Required       | Description                                                                       |
| ----------------- | ----------- | -------------- | --------------------------------------------------------------------------------- |
| `AI_BINDING_NAME` | `minimaxAI` | For Workers AI | The binding name defined in `wrangler.toml`. Must match the `[ai].binding` value. |

> [!NOTE]
> When deploying to Cloudflare Pages, `AI_BINDING_NAME` should match the binding defined in your `wrangler.toml` file. See the AI Binding Configuration section below.

## Optional Variables

Configure these based on your feature requirements.

### Notification Variables

#### Telegram Notifications

| Variable                    | Example            | Required | Description                                      |
| --------------------------- | ------------------ | -------- | ------------------------------------------------ |
| `NOTIFY_TELEGRAM_BOT_TOKEN` | `123456789:ABC...` | No       | Telegram Bot API token for sending notifications |
| `NOTIFY_TELEGRAM_CHAT_ID`   | `123456789`        | No       | Target chat ID for Telegram notifications        |

See the [Notification Guide](/en/posts/notification-guide) for setup instructions.

#### Email Notifications (Resend)

| Variable                | Example                  | Required | Description                            |
| ----------------------- | ------------------------ | -------- | -------------------------------------- |
| `NOTIFY_RESEND_API_KEY` | `re_xxx`                 | No       | Resend API key for email notifications |
| `NOTIFY_RESEND_FROM`    | `noreply@yourdomain.com` | No       | Sender email address                   |
| `NOTIFY_RESEND_TO`      | `you@example.com`        | No       | Recipient email address                |

### AI Provider Variables

For custom AI providers (not Cloudflare Workers AI):

| Variable      | Example                     | Required   | Description                                |
| ------------- | --------------------------- | ---------- | ------------------------------------------ |
| `AI_API_KEY`  | `sk-xxx`                    | For OpenAI | API key for AI provider                    |
| `AI_BASE_URL` | `https://api.openai.com/v1` | For OpenAI | Base URL for AI API endpoint               |
| `AI_MODEL`    | `gpt-4o-mini`               | No         | Model name to use (default: `gpt-4o-mini`) |

See the [AI Guide](/en/posts/ai-guide) for detailed configuration.

### Site Configuration

| Variable      | Example                 | Required | Description                  |
| ------------- | ----------------------- | -------- | ---------------------------- |
| `SITE_URL`    | `https://your-blog.com` | No       | Your site URL for AI context |
| `SITE_AUTHOR` | `YourName`              | No       | Author name for AI responses |

### CORS Configuration

| Variable        | Example                  | Required | Description                                                         |
| --------------- | ------------------------ | -------- | ------------------------------------------------------------------- |
| `CORS_ORIGIN`   | `https://your-blog.com`  | No       | Allowed origin for CORS headers. Replaces the default `*` wildcard. |

- **When to set**: In production to restrict API access to your domain only.
- **Default behavior**: When unset, the API allows all origins (`*`).

## Step-by-Step: Adding Variables

Follow these steps to add environment variables in Cloudflare Pages Dashboard.

### Step 1: Open Your Project

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Workers & Pages** in the left sidebar
3. Select your astro-minimax project from the list

### Step 2: Navigate to Settings

1. Click the **Settings** tab in the project navigation
2. Scroll down to find **Environment variables**
3. Click **Environment variables** to open the configuration panel

### Step 3: Add Variables

For each variable you need to configure:

1. Click **Add variable** button
2. Enter the variable name (e.g., `NODE_VERSION`)
3. Enter the value (e.g., `22`)
4. Select the environment scope:
   - **Production** for live deployments
   - **Preview** for branch previews
   - Or select both if the value is the same
5. Click **Save**

### Step 4: Configure Encryption (Recommended)

For sensitive values like API keys:

1. After adding the variable, locate it in the list
2. Click the **Encrypt** option if available
3. This prevents the value from being visible in the dashboard

> [!WARNING]
> Once a variable is encrypted, you cannot view its original value. Store your secrets securely elsewhere.

### Step 5: Deploy Changes

Build-time variables require a new deployment:

1. Go to the **Deployments** tab
2. Click **Retry deployment** on the latest deployment
3. Or push a new commit to trigger automatic deployment

Runtime variables take effect immediately without redeployment.

## AI Binding Configuration

The AI chat feature uses Cloudflare Workers AI, which requires proper binding configuration.

### wrangler.toml Configuration

Your project should have a `wrangler.toml` file in `apps/blog/`:

```toml
name = "astro-minimax"
pages_build_output_dir = "dist"
compatibility_date = "2026-03-12"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "minimaxAI"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
```

### Matching Environment Variable

The `AI_BINDING_NAME` environment variable must match the `[ai].binding` value:

| wrangler.toml           | Environment Variable        |
| ----------------------- | --------------------------- |
| `binding = "minimaxAI"` | `AI_BINDING_NAME=minimaxAI` |

### How It Works

1. Cloudflare Pages reads `wrangler.toml` and creates the Workers AI binding
2. Pages Functions receive that binding at runtime
3. Your code accesses AI via the binding name
4. `AI_BINDING_NAME` tells astro-minimax which runtime binding name to resolve

## KV Namespace Configuration

KV Namespace is optional and used for caching AI responses.

### When to Configure KV

| Scenario            | KV Needed |
| ------------------- | --------- |
| Basic AI chat       | No        |
| Response caching    | Yes       |
| Rate limiting       | Yes       |
| Session persistence | Yes       |

### Adding KV Namespace

1. In Cloudflare Dashboard, go to **Workers & Pages** → **KV**
2. Create a new namespace or use an existing one
3. Copy the namespace ID
4. Update your `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
```

5. Redeploy your project

## Security Best Practices

### Secrets Management

| Practice                | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| Use encrypted variables | Encrypt sensitive values in the dashboard            |
| Separate environments   | Use different credentials for production and preview |
| Limit access            | Only grant team members access who need it           |
| Rotate keys             | Periodically rotate API keys and tokens              |
| Never commit secrets    | Do not add `.env` files to version control           |

### Variable Scope Recommendations

| Variable Type               | Production | Preview  | Encrypted |
| --------------------------- | ---------- | -------- | --------- |
| `NODE_VERSION`              | Yes        | Yes      | No        |
| `AI_BINDING_NAME`           | Yes        | Yes      | No        |
| `AI_API_KEY`                | Yes        | Yes      | Yes       |
| `NOTIFY_TELEGRAM_BOT_TOKEN` | Yes        | Optional | Yes       |
| `NOTIFY_RESEND_API_KEY`     | Yes        | Optional | Yes       |
| `SITE_URL`                  | Yes        | Yes      | No        |
| `SITE_AUTHOR`               | Yes        | Yes      | No        |

### Access Control

In Cloudflare Dashboard:

```
Your Project → Settings → Access policies
```

Configure who can:

- View environment variables
- Modify environment variables
- Deploy to production

## Troubleshooting

### Build Fails: Node Version Issues

**Symptom**: Build fails with Node.js compatibility errors.

**Solution**:

1. Verify `NODE_VERSION=22` is set in environment variables
2. Check that the variable is set for **Production** environment
3. Redeploy after adding or changing the variable

### AI Chat Not Working

**Symptom**: AI chat returns errors or no response.

**Solutions**:

| Check              | Action                                                   |
| ------------------ | -------------------------------------------------------- |
| Workers AI binding | Verify `wrangler.toml` has `[ai]` section                |
| Binding name       | Ensure `AI_BINDING_NAME` matches `wrangler.toml` binding |
| Deployment type    | Must deploy to Cloudflare Pages (not static hosting)     |
| AI quota           | Check Cloudflare Dashboard for Workers AI usage limits   |

### Notifications Not Sending

**Symptom**: No notifications received for comments or AI chat.

**Solutions**:

| Check                 | Action                                            |
| --------------------- | ------------------------------------------------- |
| Environment variables | Verify all `NOTIFY_*` variables are set correctly |
| Variable scope        | Ensure variables are set for **Production**       |
| Chat ID (Telegram)    | Verify the Chat ID is correct (must be numeric)   |
| Bot permissions       | For groups, bot must be an administrator          |
| API key validity      | Test the API key separately                       |

### Variables Not Taking Effect

**Symptom**: Changes to environment variables don't change behavior.

**Solutions**:

1. **Build-time variables**: Trigger a new deployment
2. **Runtime variables**: Wait a few seconds for propagation
3. **Cache**: Clear Cloudflare cache if applicable
4. **Variable name**: Check for typos in variable names

### Preview vs Production Differences

**Symptom**: Features work in preview but not production (or vice versa).

**Solution**:

1. Open environment variables settings
2. Check which scope each variable is assigned to
3. Ensure critical variables are set for both **Production** and **Preview**

## Next Steps

After configuring environment variables:

1. **Test AI Chat**: Visit your deployed site and test the AI chat feature. See [AI Guide](/en/posts/ai-guide) for detailed testing.

2. **Test Notifications**: Trigger a test comment or AI conversation to verify notifications. See [Notification Guide](/en/posts/notification-guide) for troubleshooting.

3. **Monitor Deployment**: Check deployment logs in Cloudflare Dashboard for any build errors.

4. **Configure Custom Domain**: Add your custom domain in Cloudflare Pages settings. See [Deployment Guide](/en/posts/deployment-guide) for instructions.

5. **Set Up Analytics**: Configure Umami analytics for visitor tracking.

## Related Documentation

- [Deployment Guide](/en/posts/deployment-guide) — Complete deployment instructions
- [AI Guide](/en/posts/ai-guide) — AI chat configuration details
- [Notification Guide](/en/posts/notification-guide) — Notification system setup
- [Feature Overview](/en/posts/feature-overview) — All available features
