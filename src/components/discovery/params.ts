/** Helpers for reading discovery filters from the URL and building links that keep them. */

export type RawParams = Record<string, string | string[] | undefined>;

export function str(p: RawParams, key: string): string | undefined {
  const v = p[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim().slice(0, 200) : undefined;
}

export function int(p: RawParams, key: string): number | undefined {
  const s = str(p, key);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function intList(p: RawParams, key: string): number[] {
  const v = p[key];
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return [...new Set(arr.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 10);
}

export function money(p: RawParams, key: string): number | undefined {
  const s = str(p, key);
  if (!s) return undefined;
  const n = Number(s.replace(/[, ]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
}

export function date(p: RawParams, key: string): string | undefined {
  const s = str(p, key);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
}

export function page(p: RawParams): number {
  return Math.min(int(p, "page") ?? 1, 500);
}

/** Query string from params with overrides; undefined/empty removes a key. */
export function withParams(p: RawParams, overrides: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (k in overrides) continue;
    for (const x of Array.isArray(v) ? v : v ? [v] : []) if (x) q.append(k, x);
  }
  for (const [k, v] of Object.entries(overrides)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Count of active filters (excluding sort/page/q) for the mobile button badge. */
export function activeFilterCount(p: RawParams, keys: string[]): number {
  return keys.reduce((n, k) => {
    const v = p[k];
    const arr = Array.isArray(v) ? v : v ? [v] : [];
    return n + arr.filter(Boolean).length;
  }, 0);
}
