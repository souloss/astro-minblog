import type { WebhookConfig, WebhookPayload, SendResult, Logger } from '../types.js';

export interface WebhookProvider {
  send(payload: WebhookPayload): Promise<SendResult>;
}

function redactUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '<invalid-url>';
  }
}

export function createWebhookProvider(
  config: WebhookConfig,
  logger?: Logger
): WebhookProvider {
  const { url, method = 'POST', headers = {} } = config;

  return {
    async send(payload: WebhookPayload): Promise<SendResult> {
      const start = Date.now();
      
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });

        const duration = Date.now() - start;

        if (!response.ok) {
          const errorText = await response.text();
          const errorMsg = `Webhook error: ${response.status} - ${errorText}`;
          
          logger?.error('Webhook send failed', new Error(errorMsg), {
            url: redactUrl(url),
            status: response.status,
          });
          
          return {
            channel: 'webhook',
            success: false,
            error: errorMsg,
            duration,
          };
        }

        logger?.info('Webhook notification sent', { url: redactUrl(url), duration });
        
        return {
          channel: 'webhook',
          success: true,
          duration,
        };
      } catch (error) {
        const duration = Date.now() - start;
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        logger?.error('Webhook send failed', error instanceof Error ? error : undefined, {
          url: redactUrl(url),
          error: errorMsg,
        });
        
        return {
          channel: 'webhook',
          success: false,
          error: errorMsg,
          duration,
        };
      }
    },
  };
}