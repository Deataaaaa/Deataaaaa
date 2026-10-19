import json

import pytest
import requests

from cuscan import advice, calc, history, prices
from cuscan.materials import load_catalog


def test_catalogue_par_defaut_valide():
    cat = load_catalog()
    assert cat.materials
    for m in cat.materials.values():
        assert m.grade in cat.grades


def _write(tmp_path, data):
    p = tmp_path / "m.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return p


def test_catalogue_grade_inconnu(tmp_path):
    p = _write(tmp_path, {
        "grades": {"a": {"label": "A", "rachat_pct": 0.5}},
        "materials": {"x": {"label": "X", "copper_pct_min": 0.1, "copper_pct_max": 0.2, "grade": "b"}},
    })
    with pytest.raises(ValueError, match="grade inconnu"):
        load_catalog(p)


def test_catalogue_min_sup_max(tmp_path):
    p = _write(tmp_path, {
        "grades": {"a": {"label": "A", "rachat_pct": 0.5}},
        "materials": {"x": {"label": "X", "copper_pct_min": 0.5, "copper_pct_max": 0.2, "grade": "a"}},
    })
    with pytest.raises(ValueError):
        load_catalog(p)


def test_conversion_usd_lb_eur_kg():
    assert prices.usd_lb_to_eur_kg(1.0, 1.0) == pytest.approx(2.20462262)
    assert prices.usd_lb_to_eur_kg(6.59, 0.88865) == pytest.approx(12.91, abs=0.01)


class _FakeResp:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self.payload


class _FakeSession:
    def __init__(self, fail=False):
        self.fail = fail
        self.calls = 0

    def get(self, url, **kw):
        self.calls += 1
        if self.fail:
            raise requests.ConnectionError("hors ligne")
        if "yahoo" in url:
            return _FakeResp({"chart": {"result": [{"meta": {"regularMarketPrice": 5.0}}]}})
        return _FakeResp({"rates": {"EUR": 0.9}})


def test_get_quote_et_cache(tmp_path):
    cache = tmp_path / "c.json"
    s = _FakeSession()
    q = prices.get_quote(cache_path=cache, session=s)
    assert q.eur_per_kg == pytest.approx(5.0 * 2.20462262 * 0.9)
    prices.get_quote(cache_path=cache, session=s)
    assert s.calls == 2  # deuxième appel servi par le cache


def test_get_quote_hors_ligne_renvoie_cache_perime(tmp_path):
    cache = tmp_path / "c.json"
    prices.get_quote(cache_path=cache, session=_FakeSession())
    q = prices.get_quote(cache_path=cache, ttl_s=0, session=_FakeSession(fail=True))
    assert q.usd_per_lb == 5.0


def test_get_quote_hors_ligne_sans_cache(tmp_path):
    with pytest.raises(requests.RequestException):
        prices.get_quote(cache_path=tmp_path / "c.json", session=_FakeSession(fail=True))


def test_conseils_achat_perdant():
    cat = load_catalog()
    m = cat.materials["cable_domestique"]
    g = cat.grade_of(m)
    est = calc.estimate(1, m.copper_pct_min, m.copper_pct_max, 10, g.rachat_pct, 100)
    lines = advice.advise(m, g, est, 100)
    assert any("perdant" in l for l in lines)
    assert advice.LEGAL in lines


def test_conseils_valorisation_rentable():
    cat = load_catalog()
    m = cat.materials["cable_gros"]
    g = cat.grade_of(m)
    ug = cat.grades[m.valorisation.grade]
    est = calc.estimate(50, m.copper_pct_min, m.copper_pct_max, 13, g.rachat_pct, 0)
    upg = calc.upgrade(50, m.copper_pct_min, m.copper_pct_max, 13, g.rachat_pct, ug.rachat_pct,
                       m.valorisation.kg_objet_par_heure, 5)
    lines = advice.advise(m, g, est, 0, upg, ug)
    assert any("Ça vaut le coup" in l for l in lines)


def test_historique(tmp_path):
    db = tmp_path / "h.db"
    row = {c: 1.0 for c in history.COLUMNS if c not in ("id", "date", "objet", "description")}
    history.save({**row, "objet": "Câble", "description": ""}, path=db)
    rows = history.load_all(path=db)
    assert len(rows) == 1 and rows[0]["objet"] == "Câble"
    history.delete(rows[0]["id"], path=db)
    assert history.load_all(path=db) == []
