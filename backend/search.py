import gzip
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .corpus import DATA


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFD", value.casefold())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return " ".join(re.findall(r"[^\W_]+", text, flags=re.UNICODE))


@dataclass(frozen=True)
class Entry:
    id: str
    testament: str
    book: str
    passage: str
    text: str

    @property
    def reference(self) -> str:
        return f"{self.book} {self.passage}"


book_codes = """
GEN Gênesis|EXO Êxodo|LEV Levítico|NUM Números|DEU Deuteronômio|JOS Josué|JDG Juízes|RUT Rute
1SA 1 Samuel|2SA 2 Samuel|1KI 1 Reis|2KI 2 Reis|1CH 1 Crônicas|2CH 2 Crônicas|EZR Esdras|NEH Neemias
EST Ester|JOB Jó|PSA Salmos|PRO Provérbios|ECC Eclesiastes|SOL Cântico dos Cânticos|ISA Isaías|JER Jeremias
LAM Lamentações|EZE Ezequiel|DAN Daniel|HOS Oseias|JOE Joel|AMO Amós|OBA Obadias|JON Jonas
MIC Miqueias|NAH Naum|HAB Habacuque|ZEP Sofonias|HAG Ageu|ZEC Zacarias|MAL Malaquias
MAT Mateus|MAR Marcos|LUK Lucas|JOH João|ACT Atos|ROM Romanos|1CO 1 Coríntios|2CO 2 Coríntios
GAL Gálatas|EPH Efésios|PHI Filipenses|COL Colossenses|1TH 1 Tessalonicenses|2TH 2 Tessalonicenses
1TI 1 Timóteo|2TI 2 Timóteo|TIT Tito|PHM Filemom|HEB Hebreus|JAM Tiago|1PE 1 Pedro|2PE 2 Pedro
1JO 1 João|2JO 2 João|3JO 3 João|JUD Judas|REV Apocalipse
""".strip().replace("\n", "|").split("|")
BOOK_NAMES = {
    code: (name, "AT" if index < 39 else "NT")
    for index, (code, name) in enumerate(row.split(" ", 1) for row in book_codes)
}
Corpus = Literal["bible", "summaries"]


def load_bible():
    path = Path(__file__).resolve().parent / "data" / "porbr2018_vpl.txt.gz"
    with gzip.open(path, "rt", encoding="utf-8-sig") as source:
        for line in source:
            code, passage, text = line.rstrip("\r\n").split(" ", 2)
            book, testament = BOOK_NAMES[code]
            yield Entry(f"{code}.{passage}", testament, book, passage, text)


def make_index(entries):
    return tuple((entry, normalize(entry.text), normalize(entry.reference)) for entry in entries)


INDEXES = {
    "bible": make_index(load_bible()),
    "summaries": make_index(Entry(f"resumo-{i}", *line.split("|")) for i, line in enumerate(DATA.splitlines(), 1)),
}
CATALOGS = {
    corpus: tuple(dict.fromkeys((entry.book, entry.testament) for entry, _, _ in index))
    for corpus, index in INDEXES.items()
}


def search(query: str, mode: str, book: str = "", testament: str = "", corpus: Corpus = "bible", page: int = 1, limit: int = 30) -> dict:
    term = normalize(query)
    if not term:
        return {"rows": [], "matches": 0, "occurrences": 0}
    words = [term] if mode == "expression" else list(dict.fromkeys(term.split()))
    patterns = [re.compile(rf"(?<!\w){re.escape(word)}(?!\w)") for word in words]
    offset = (page - 1) * limit
    rows = []
    matches = occurrences = 0
    for entry, text, reference in INDEXES[corpus]:
        if (book and book != entry.book) or (testament and testament != entry.testament):
            continue
        counts = [len(pattern.findall(text)) for pattern in patterns]
        matches_text = all(counts)
        reference_match = reference == term or reference.startswith(term + " ")
        if not (matches_text or reference_match):
            continue
        count = sum(counts) if matches_text else 0
        if offset <= matches < offset + limit:
            rows.append({
                "id": entry.id, "book": entry.book, "testament": entry.testament,
                "reference": entry.reference, "text": entry.text, "occurrences": count,
                "match": "text" if matches_text else "reference",
            })
        matches += 1
        occurrences += count
    return {"rows": rows, "matches": matches, "occurrences": occurrences}
