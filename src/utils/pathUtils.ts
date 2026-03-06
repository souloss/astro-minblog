/**
 * Check if a path is active (current) relative to the given pathname.
 * Handles trailing slashes and partial path matching for nested routes.
 */
export function isPathActive(path: string, pathname: string): boolean {
  const currentPath =
    pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  if (currentPath === path) return true;

  const currentParts = currentPath.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  return currentParts[0] === pathParts[0];
}
