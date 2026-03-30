import type { CommentEvent } from "../types.js";

interface WalineComment {
  objectId?: string | number;
  url?: string;
  nick?: string;
  mail?: string;
  link?: string;
  comment?: string;
  rawComment?: string;
  ip?: string;
  ua?: string;
  insertedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  type?: string;
  user_id?: number;
  rid?: string | number;
}

export interface WalineAdaptedComment {
  eventType: string;
  input: Omit<CommentEvent, "type"> | null;
}

export function adaptWalineComment(
  raw: unknown,
  siteUrl: string
): WalineAdaptedComment {
  const parsed = parseWalinePayload(raw);

  if (!parsed.commentData) {
    return {
      eventType: parsed.eventType,
      input: null,
    };
  }

  const urlPath = getStringValue(parsed.commentData.url) || "";
  const postUrl = urlPath.startsWith("http") ? urlPath : `${siteUrl}${urlPath}`;

  return {
    eventType: parsed.eventType,
    input: {
      author: getStringValue(parsed.commentData.nick) || "匿名用户",
      content:
        getStringValue(parsed.commentData.rawComment) ||
        getStringValue(parsed.commentData.comment) ||
        "",
      postTitle: extractPostTitle(urlPath),
      postUrl,
      source: {
        kind: "waline",
        eventName: parsed.eventType,
      },
    },
  };
}

function parseWalinePayload(raw: unknown): {
  commentData: WalineComment | null;
  eventType: string;
} {
  if (!raw || typeof raw !== "object") {
    return { commentData: null, eventType: "unknown" };
  }

  const data = raw as Record<string, unknown>;

  if (data.type === "new_comment" || data.type === "new_reply") {
    const dataObj = data.data as Record<string, unknown> | undefined;
    if (dataObj && dataObj.comment && typeof dataObj.comment === "object") {
      return {
        commentData: dataObj.comment as WalineComment,
        eventType: data.type,
      };
    }

    return {
      commentData: (dataObj as WalineComment | undefined) ?? null,
      eventType: data.type,
    };
  }

  if (data.url || data.nick || data.comment || data.mail) {
    return {
      commentData: data as WalineComment,
      eventType: data.rid ? "new_reply" : "new_comment",
    };
  }

  return { commentData: null, eventType: "unknown" };
}

function getStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return String(value);
}

function extractPostTitle(url: string): string {
  if (!url || typeof url !== "string") {
    return "博客文章";
  }

  const match = url.match(/\/(?:[a-z]{2}\/)?posts?\/([^/]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].replace(/-/g, " "));
    } catch {
      return match[1].replace(/-/g, " ");
    }
  }

  return "博客文章";
}
