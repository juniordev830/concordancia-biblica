# Concordância bíblica

Busca por palavras, expressões e referências na Bíblia Livre, filtros, paginação, contagem, favoritos, histórico e API documentada.

## Como executar

Requisitos: Node.js 24 e npm. Para a concordância, Python 3.12 também é necessário.

```bash
npm ci
npm run dev
```

Abra o endereço local informado pelo Vite. Para conferir o projeto:

```bash
npm test
npm run build
```

## API Python

Em outro terminal, a partir da pasta do projeto:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
python -m unittest discover -s backend/tests -v
```

A documentação da API está em http://127.0.0.1:8000/docs. Em desenvolvimento, o Vite encaminha /api para a porta 8000. Para execução em produção local, faça `npm run build` antes de iniciar a API e abra http://127.0.0.1:8000.

## Exemplo de uso

Pesquise “oração” ou “João 15:8” e filtre por testamento ou livro. Escolha também o índice de resumos originais.

## Limitações

As ocorrências contam termos normalizados na edição e consulta selecionadas. A busca não faz análise morfológica.

## Arquitetura e fontes

A interface usa React e TypeScript, com Vite para desenvolvimento e build. A lógica do domínio fica em módulos de `src/`, separados da interface, e os testes em `tests/`. Os dados pessoais dos recursos que exigem persistência usam armazenamento local do navegador. A concordância possui API FastAPI e índice local em `backend/`.

As fontes e licenças estão em [docs/FONTES.md](docs/FONTES.md). A licença do código está em [LICENSE](LICENSE). O fluxo em `.github/workflows/ci.yml` executa testes e build em pushes e pull requests.
