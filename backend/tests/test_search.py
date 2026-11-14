import unittest

import httpx

from backend.main import app
from backend.search import search


class SearchTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_catalog_matches_edition(self):
        catalog = (await self.client.get("/api/catalog")).json()
        self.assertEqual(catalog["entries"], 31102)
        self.assertEqual(len(catalog["books"]), 66)
        self.assertIn({"book": "João", "testament": "NT"}, catalog["books"])

    async def test_word_and_accent_normalization(self):
        matches = search("oracao", "words", corpus="summaries")
        self.assertEqual(matches, search("ORAÇÃO", "words", corpus="summaries"))
        self.assertTrue(any(row["reference"].startswith("Mateus 6") for row in matches["rows"]))
        self.assertEqual(search("orac", "words", corpus="summaries")["matches"], 0)

    async def test_phrase_mode_and_reverse_order(self):
        self.assertGreater(search("nova aliança", "expression", corpus="summaries")["matches"], 0)
        self.assertEqual(search("aliança nova", "expression", corpus="summaries")["matches"], 0)
        self.assertGreater(search("aliança nova", "words", corpus="summaries")["matches"], 0)

    async def test_reference_only_and_filters(self):
        request = await self.client.get("/api/search", params={"q": "Joao 15:8", "book": "João", "testament": "NT"})
        rows = request.json()
        self.assertEqual(rows["matches"], 1)
        self.assertEqual(rows["rows"][0]["match"], "reference")
        self.assertEqual(rows["occurrences"], 0)
        self.assertEqual(search("nova aliança", "expression", testament="NT", corpus="summaries")["matches"], 0)

    async def test_search_validation(self):
        for params in ({}, {"q": "++"}, {"q": "fé", "mode": "invalid"}, {"q": "fé", "book": "Inventado"}, {"q": "fé", "limit": 101}):
            with self.subTest(params=params):
                self.assertEqual((await self.client.get("/api/search", params=params)).status_code, 422)

    async def test_openapi_and_count_are_consistent(self):
        self.assertIn("/api/search", (await self.client.get("/openapi.json")).json()["paths"])
        found = (await self.client.get("/api/search", params={"q": "Deus", "testament": "AT", "corpus": "summaries"})).json()
        self.assertGreater(found["matches"], 0)
        self.assertEqual(found["matches"], len(found["rows"]))
        self.assertEqual(found["occurrences"], sum(item["occurrences"] for item in found["rows"]))

    async def test_empty_results(self):
        self.assertEqual((await self.client.get("/api/search", params={"q": "inexistente"})).json(),
                         {"rows": [], "matches": 0, "occurrences": 0})

    async def test_pagination_keeps_counts_and_order(self):
        first = search("João 15", "words", page=1, limit=2)
        second = search("João 15", "words", page=2, limit=2)
        self.assertEqual(first["matches"], 27)
        self.assertEqual(second["matches"], 27)
        self.assertEqual(first["rows"][0]["reference"], "João 15:1")
        self.assertEqual(second["rows"][0]["reference"], "João 15:3")


if __name__ == "__main__":
    unittest.main()
