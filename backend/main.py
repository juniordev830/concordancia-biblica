from pathlib import Path
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .search import CATALOGS, INDEXES, Corpus, normalize, search

app = FastAPI(
    title="Concordância bíblica",
    version="1.0.0",
    description="Pesquisa local na Bíblia Livre (CC BY 4.0) e em resumos editoriais originais, em índices separados.",
)


class Result(BaseModel):
    id: str
    book: str
    testament: Literal["AT", "NT"]
    reference: str
    text: str
    occurrences: int
    match: Literal["text", "reference"]


class SearchResponse(BaseModel):
    rows: list[Result]
    matches: int
    occurrences: int


@app.get("/api/catalog", summary="Lista os livros do índice selecionado")
def catalog(corpus: Corpus = "bible"):
    return {
        "books": [{"book": name, "testament": testament} for name, testament in CATALOGS[corpus]],
        "entries": len(INDEXES[corpus]),
    }


@app.get("/api/search", response_model=SearchResponse, summary="Busca referências e texto")
def query_index(
    q: Annotated[str, Query(min_length=1, max_length=120, description="Termos ou referência bibliográfica")],
    mode: Literal["words", "expression"] = "words",
    book: Annotated[str, Query(max_length=60)] = "",
    testament: Literal["", "AT", "NT"] = "",
    corpus: Corpus = "bible",
    page: Annotated[int, Query(ge=1, le=31102)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
):
    if not normalize(q):
        raise HTTPException(status_code=422, detail="Informe ao menos uma palavra ou referência.")
    if book and book not in {name for name, _ in CATALOGS[corpus]}:
        raise HTTPException(status_code=422, detail="Escolha um livro presente no catálogo.")
    return search(q, mode, book, testament, corpus, page, limit)


dist = Path(__file__).resolve().parents[1] / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
