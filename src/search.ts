export type Corpus = 'bible' | 'summaries';
export type Criteria = { q: string; mode: 'words' | 'expression'; book: string; testament: string; corpus: Corpus };
export type Match = { id: string; book: string; reference: string; testament: string; text: string; occurrences: number; match: 'text' | 'reference' };
export type Matches = { rows: Match[]; matches: number; occurrences: number };
export type Catalog = { entries: number; books: { book: string; testament: string }[] };
export const pageSize = 30;

export function searchUrl(criteria: Criteria, page = 1) {
  return '/api/search?' + new URLSearchParams({ ...criteria, q: criteria.q.trim(), page: String(page), limit: String(pageSize) }).toString();
}

export function recentQueries(history: Criteria[], criteria: Criteria): Criteria[] {
  const key = searchUrl(criteria);
  return [criteria, ...history.filter(item => searchUrl(item) !== key)].slice(0, 12);
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(typeof data?.detail === 'string' ? data.detail : 'A API está indisponível. Verifique se o servidor está em execução.');
  }
  return response.json() as Promise<T>;
}
