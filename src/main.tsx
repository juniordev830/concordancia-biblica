import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <a className="skip" href="#conteudo">Ir para o conteúdo</a>
    <header className="masthead">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">⌕</span>
        <span>Concordância bíblica</span>
      </div>
      <span className="collection">Coleção de estudo bíblico</span>
    </header>
    <main id="conteudo">
      <div className="intro">
        <h1>Concordância bíblica</h1>
        <nav className="atalhos" aria-label="Seções desta página">
          <a href="#resultados">Resultados</a>
          <a href="#favoritos">Favoritos</a>
          <a href="#buscas">Buscas recentes</a>
        </nav>
      </div>
      <App />
    </main>
  </StrictMode>,
);
