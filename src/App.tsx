import { useEffect, useRef, useState } from 'react';
import { exportMatches, getJson, pageSize, parseSavedFavorites, parseSavedHistory, recentQueries, searchUrl } from './search.ts';
import type { Catalog, Corpus, Criteria, Match, Matches } from './search.ts';
import { useLocalState } from './storage.ts';

const initial: Criteria = { q: '', mode: 'words', book: '', testament: '', corpus: 'bible' };

export default function App() {
  const [criteria, setCriteria] = useState(initial);
  const [catalog, setCatalog] = useState<Catalog>();
  const [catalogIssue, setCatalogIssue] = useState(false);
  const [catalogAttempt, retryCatalog] = useState(0);
  const [results, setResults] = useState<Matches>();
  const [page, setPage] = useState(1);
  const [lastSearch, setLastSearch] = useState<Criteria>();
  const [pending, setPending] = useState(false);
  const [issue, setIssue] = useState('');
  const [history, setHistory, historyError] = useLocalState<Criteria[]>('concordancia-historico-v2', [], parseSavedHistory);
  const [favorites, setFavorites, favoriteError] = useLocalState<Match[]>('concordancia-favoritos-v2', [], parseSavedFavorites);
  const request = useRef<AbortController>(null);
  const bookOptions = catalog?.books.filter(item => !criteria.testament || item.testament === criteria.testament) ?? [];
  const apiError = 'Não foi possível consultar o servidor. Confirme se a API está rodando.';

  useEffect(() => {
    const controller = new AbortController();
    setCatalogIssue(false);
    getJson<Catalog>('/api/catalog?corpus=' + criteria.corpus, controller.signal).then(setCatalog).catch(() => {
      if (!controller.signal.aborted) setCatalogIssue(true);
    });
    return () => controller.abort();
  }, [catalogAttempt, criteria.corpus]);
  useEffect(() => () => request.current?.abort(), []);

  async function run(input: Criteria, targetPage = 1) {
    const cleaned = { ...input, q: input.q.trim() };
    if (!cleaned.q) {
      setIssue('Digite uma palavra, expressão ou referência.');
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setIssue('');
    if (targetPage === 1) setResults(undefined);
    try {
      const data = await getJson<Matches>(searchUrl(cleaned, targetPage), controller.signal);
      if (controller.signal.aborted) return;
      setResults(data);
      setPage(targetPage);
      setLastSearch(cleaned);
      if (targetPage === 1) setHistory(previous => recentQueries(previous, cleaned));
    } catch (cause) {
      if (!controller.signal.aborted) setIssue(cause instanceof Error && typeof cause.message === 'string' && !cause.message.includes('fetch') ? cause.message : apiError);
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  const isFavorite = (entry: Match) => favorites.some(item => item.id === entry.id);
  function favorite(entry: Match) {
    setFavorites(previous => previous.some(item => item.id === entry.id)
      ? previous.filter(item => item.id !== entry.id) : [...previous, entry]);
  }

  function downloadPage() {
    if (!results?.rows.length || !lastSearch) return;
    const file = new Blob(['\uFEFF', exportMatches(results.rows, lastSearch.corpus)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'referencias-pagina-' + page + '.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="split">
    <div className="stack">
      <section className="panel stack">
        <form className="form" onSubmit={event => { event.preventDefault(); void run(criteria); }}>
          <label>Palavra, expressão ou referência<input required type="search" maxLength={120} placeholder="Ex.: oração ou João 15" value={criteria.q} onChange={event => setCriteria({ ...criteria, q: event.target.value })} /></label>
          <label>Índice<select value={criteria.corpus} onChange={event => {
            setCriteria({ ...criteria, corpus: event.target.value as Corpus, book: '' });
            setCatalog(undefined);
          }}><option value="bible">Bíblia Livre</option><option value="summaries">Resumos originais</option></select></label>
          <div className="three collapse">
            <label>Modo<select value={criteria.mode} onChange={event => setCriteria({ ...criteria, mode: event.target.value as Criteria['mode'] })}>
              <option value="words">Todas as palavras</option><option value="expression">Expressão exata</option>
            </select></label>
            <label>Testamento<select value={criteria.testament} onChange={event => setCriteria({ ...criteria, testament: event.target.value, book: '' })}>
              <option value="">Ambos</option><option value="AT">Antigo</option><option value="NT">Novo</option>
            </select></label>
            <label>Livro<select value={criteria.book} onChange={event => setCriteria({ ...criteria, book: event.target.value })}>
              <option value="">Todos do índice</option>{bookOptions.map(item => <option key={item.book}>{item.book}</option>)}
            </select></label>
          </div>
          <button className="primary">{pending ? 'Pesquisar novamente' : 'Pesquisar'}</button>
        </form>
        <p className="muted">{catalog ? catalog.entries.toLocaleString('pt-BR') + (criteria.corpus === 'bible' ? ' versículos no índice.' : ' resumos didáticos no índice.') : 'Carregando informações do índice.'}</p>
        <small>Texto bíblico: <a href="https://ebible.org/find/details.php?id=porbr2018">Bíblia Livre (BLIVRE)</a> · © 2018 Diego Santos, Mario Sérgio e Marco Teles · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</small>
        {catalogIssue && <div className="row"><p role="alert" className="error">Catálogo indisponível.</p><button onClick={() => retryCatalog(catalogAttempt + 1)}>Recarregar catálogo</button></div>}
        {(issue || historyError || favoriteError) && <p role="alert" className="error">{issue || historyError || favoriteError}</p>}
      </section>
      <section className="panel stack" id="resultados" tabIndex={-1}>
        <h2>Resultados</h2>
        <p className="muted" role="status">{pending ? 'Pesquisando…' : results ? results.matches + ' referência(s) · ' + results.occurrences + ' ocorrência(s) no índice consultado' : 'Faça uma pesquisa para ver as referências.'}</p>
        {results?.matches === 0 && <p>Nenhum resultado. Experimente outra palavra ou retire um filtro.</p>}
        {results && results.rows.length > 0 && <button disabled={pending} onClick={downloadPage}>Baixar página em CSV</button>}
        <ul className="list">{results?.rows.map(entry => <li className="subtle stack" key={entry.id}>
          <div className="row between"><h3>{entry.reference}</h3><button aria-pressed={isFavorite(entry)} onClick={() => favorite(entry)}>Favorito</button></div>
          <p>{entry.text}</p><small>{entry.match === 'reference' ? 'Correspondência na referência' : entry.occurrences + ' ocorrência(s) neste resultado'}</small>
        </li>)}</ul>
        {results && lastSearch && results.matches > pageSize && <nav className="row" aria-label="Paginação de resultados">
          <button disabled={pending || page === 1} onClick={() => void run(lastSearch, page - 1)}>Anterior</button>
          <span>Página {page} de {Math.ceil(results.matches / pageSize)}</span>
          <button disabled={pending || page * pageSize >= results.matches} onClick={() => void run(lastSearch, page + 1)}>Próxima</button>
        </nav>}
      </section>
    </div>
    <aside className="stack">
      <section className="panel stack" id="favoritos" tabIndex={-1}>
        <h2>Favoritos</h2>
        {!favorites.length && <p className="muted">Marque uma referência para consultá-la depois.</p>}
        <ul className="list">{favorites.map(entry => <li className="subtle" key={entry.id}><details>
          <summary>{entry.reference}</summary><p>{entry.text}</p>
          <button className="quiet" onClick={() => favorite(entry)}>Remover favorito</button>
        </details></li>)}</ul>
      </section>
      <section className="panel stack" id="buscas" tabIndex={-1}>
        <h2>Buscas recentes</h2>
        {!history.length && <p className="muted">Suas últimas buscas ficam neste navegador.</p>}
        <ul className="list">{history.map(item => <li key={searchUrl(item)}><button className="selection" onClick={() => {
          setCriteria(item);
          void run(item);
        }}>{item.q}{item.book ? ' · ' + item.book : item.testament ? ' · ' + item.testament : ''} · {item.mode === 'words' ? 'palavras' : 'expressão'} · {item.corpus === 'bible' ? 'Bíblia Livre' : 'resumos'}</button></li>)}</ul>
        {history.length > 0 && <button className="quiet" onClick={() => setHistory([])}>Limpar histórico</button>}
        <a href="/docs">Documentação da API</a>
      </section>
    </aside>
  </div>;
}
