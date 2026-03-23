/**
 * URL utilities for safe URL construction.
 */

/**
 * Safely joins a base URL with a path, preventing double slashes.
 *
 * @param baseUrl - The base URL (e.g., "https://example.com" or "https://example.com/")
 * @param path - The path to append (e.g., "/posts/article" or "posts/article")
 * @returns The joined URL without double slashes
 *
 * @example
 * safeJoinUrl("https://example.com/", "/posts/article")  // "https://example.com/posts/article"
 * safeJoinUrl("https://example.com", "posts/article")    // "https://example.com/posts/article"
 * safeJoinUrl("https://example.com", "/posts/article")   // "https://example.com/posts/article"
 * safeJoinUrl("", "/posts/article")                      // "/posts/article"
 * safeJoinUrl("https://example.com/", "")                // "https://example.com"
 */
export function safeJoinUrl(baseUrl: string, path: string): string {
  // If no base URL, return the path as-is
  if (!baseUrl) return path;

  // If no path, return the base URL without trailing slash
  if (!path) return baseUrl.replace(/\/+$/, '');

  // If path is already a full URL, return it as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Remove trailing slashes from base URL
  const cleanBase = baseUrl.replace(/\/+$/, '');

  // Ensure path starts with a single slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}