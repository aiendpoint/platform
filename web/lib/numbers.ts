/**
 * Format a number for display.
 * 1234 → "1.2K", 10500 → "10K", 999 → "999"
 */
export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
