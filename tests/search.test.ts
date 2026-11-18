import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSavedFavorites, parseSavedHistory, recentQueries, searchUrl } from '../src/search.ts';

const search = { q: '  João & fé  ', mode: 'expression' as const, book: '', testament: 'NT', corpus: 'bible' as const };
test('valida o histórico e os favoritos salvos antes de renderizar', () => {
  const match = { id: 'JO.1.1', book: 'João', reference: 'João 1:1', testament: 'NT', text: 'Exemplo', occurrences: 0, match: 'reference' };
  assert.deepEqual(parseSavedHistory(JSON.stringify([search])), [search]);
  assert.deepEqual(parseSavedFavorites(JSON.stringify([match])), [match]);
  assert.throws(() => parseSavedHistory(JSON.stringify([{ ...search, q: null }])), /Formato inválido/);
  assert.throws(() => parseSavedFavorites('[null]'), /Formato inválido/);
});
test('URL preserva acentos e caracteres do filtro sem injetar parâmetros', () => {
  const url = new URL(searchUrl(search), 'http://localhost');
  assert.equal(url.searchParams.get('q'), 'João & fé');
  assert.equal(url.searchParams.get('testament'), 'NT');
  assert.equal([...url.searchParams].length, 7);
});
test('histórico evita duplicatas e guarda as últimas doze consultas', () => {
  const history = Array.from({ length: 14 }, (_, index) => ({ ...search, q: String(index) }));
  assert.equal(recentQueries(history, search).length, 12);
  assert.deepEqual(recentQueries([search], { ...search, q: search.q.trim() }), [{ ...search, q: search.q.trim() }]);
});
