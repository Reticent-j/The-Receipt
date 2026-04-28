/**
 * Prevent open redirects: only allow same-origin relative paths.
 */
export function safeNextPath(next: string | null): string {
  if (!next || typeof next !== "string") return "/";
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed;
}
