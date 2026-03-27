import type {
  EmailConfig,
  EmailTemplate,
  SendResult,
  Logger,
} from "../types.js";
import {
  createFailureResult,
  getDuration,
  getErrorMessage,
} from "../provider-helpers.js";

export interface EmailProvider {
  send(template: EmailTemplate): Promise<SendResult>;
}

export function createEmailProvider(
  config: EmailConfig,
  logger?: Logger
): EmailProvider {
  const { provider, apiKey, from, to } = config;

  return {
    async send(template: EmailTemplate): Promise<SendResult> {
      const start = Date.now();

      if (provider !== "resend") {
        return {
          channel: "email",
          success: false,
          error: `Unsupported email provider: ${provider}`,
          duration: 0,
        };
      }

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to,
            subject: template.subject,
            html: template.html,
            text: template.text,
          }),
          signal: AbortSignal.timeout(10_000),
        });

        const duration = getDuration(start);

        if (!response.ok) {
          const errorData = (await response.json()) as { message?: string };
          const errorMsg = `Resend API error: ${response.status} - ${errorData.message || "Unknown error"}`;

          logger?.error("Email send failed", new Error(errorMsg), {
            to,
            status: response.status,
          });

          return {
            channel: "email",
            success: false,
            error: errorMsg,
            duration,
          };
        }

        logger?.info("Email notification sent", { to, duration });

        return {
          channel: "email",
          success: true,
          duration,
        };
      } catch (error) {
        const duration = getDuration(start);
        const errorMsg = getErrorMessage(error);

        logger?.error(
          "Email send failed",
          error instanceof Error ? error : undefined,
          {
            to,
            error: errorMsg,
          }
        );

        return createFailureResult("email", errorMsg, duration);
      }
    },
  };
}
