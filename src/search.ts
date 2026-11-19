export type Corpus = 'bible' | 'summaries';
export type Criteria = { q: string; mode: 'words' | 'expression'; book: string; testament: string; corpus: Corpus };
export type Match = { id: string; book: string; reference: string; testament: string; text: string; occurrences: number; match: 'text' | 'reference' };
export type Matches = { rows: Match[]; matches: number; occurrences: number };
export type Catalog = { entries: number; books: { book: string; testament: string }[] };
export const pageSize = 30;

export function exportMatches(rows: Match[], corpus: Corpus): string {
  const source = corpus === 'bible'
    ? 'Bíblia Livre (BLIVRE) © 2018 Diego Santos, Mario Sérgio e Marco Teles, CC BY 4.0 https://ebible.org/find/details.php?id=porbr2018'
    : 'Resumos didáticos originais';
  const cell = (raw: string) => {
    const safe = /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return [
    'Referência;Texto;Ocorrências;Fonte',
    ...rows.map(row => [cell(row.reference), cell(row.text), row.occurrences, cell(source)].join(';')),
  ].join('\r\n') + '\r\n';
}

function isCriteria(value: unknown): value is Criteria {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Criteria;
  return typeof entry.q === 'string' && typeof entry.book === 'string' && typeof entry.testament === 'string'
    && (entry.mode === 'words' || entry.mode === 'expression')
    && (entry.corpus === 'bible' || entry.corpus === 'summaries');
}

function isMatch(value: unknown): value is Match {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Match;
  return typeof entry.id === 'string' && typeof entry.book === 'string' && typeof entry.reference === 'string'
    && typeof entry.testament === 'string' && typeof entry.text === 'string'
    && Number.isSafeInteger(entry.occurrences) && entry.occurrences >= 0
    && (entry.match === 'text' || entry.match === 'reference');
}

function parseSavedList<T>(raw: string, isEntry: (value: unknown) => value is T): T[] {
  const entries: unknown = JSON.parse(raw);
  if (!Array.isArray(entries) || !entries.every(isEntry)) {
    throw new Error('Formato inválido da lista salva.');
  }
  return entries;
}

export const parseSavedHistory = (raw: string) => parseSavedList(raw, isCriteria);
export const parseSavedFavorites = (raw: string) => parseSavedList(raw, isMatch);

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
