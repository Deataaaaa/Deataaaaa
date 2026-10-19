"""Cours du cuivre en €/kg.

Sources (gratuites, sans clé) :
- cuivre COMEX (contrat HG=F, USD/livre) via l'API chart de Yahoo Finance ;
- taux USD→EUR de la BCE via frankfurter.app.

Le résultat est mis en cache sur disque pour éviter de solliciter les API
à chaque rafraîchissement de page. Le cours COMEX est un cours de marché :
la décote du ferrailleur est appliquée séparément (rachat_pct du grade).
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import requests

LB_PER_KG = 2.20462262
YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/HG=F?range=1d&interval=1d"
FX_URL = "https://api.frankfurter.app/latest?from=USD&to=EUR"
CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "price_cache.json"
CACHE_TTL_S = 3600
TIMEOUT_S = 10


@dataclass(frozen=True)
class Quote:
    eur_per_kg: float
    usd_per_lb: float
    usd_eur: float
    source: str
    fetched_at: float  # epoch secondes


def usd_lb_to_eur_kg(usd_per_lb: float, usd_eur: float) -> float:
    return usd_per_lb * LB_PER_KG * usd_eur


def fetch_copper_usd_per_lb(session: requests.Session | None = None) -> float:
    s = session or requests
    r = s.get(YAHOO_URL, headers={"User-Agent": "Mozilla/5.0"}, timeout=TIMEOUT_S)
    r.raise_for_status()
    price = r.json()["chart"]["result"][0]["meta"]["regularMarketPrice"]
    return float(price)


def fetch_usd_eur(session: requests.Session | None = None) -> float:
    s = session or requests
    r = s.get(FX_URL, timeout=TIMEOUT_S)
    r.raise_for_status()
    return float(r.json()["rates"]["EUR"])


def _read_cache(path: Path) -> Quote | None:
    try:
        return Quote(**json.loads(path.read_text(encoding="utf-8")))
    except (OSError, ValueError, TypeError):
        return None


def get_quote(
    cache_path: Path = CACHE_PATH,
    ttl_s: int = CACHE_TTL_S,
    force: bool = False,
    session: requests.Session | None = None,
) -> Quote:
    """Renvoie le cours, depuis le cache s'il est frais.

    En cas d'échec réseau, renvoie le dernier cours en cache (même périmé)
    plutôt que d'échouer ; lève une exception seulement s'il n'y en a aucun.
    """
    cached = _read_cache(cache_path)
    if cached and not force and time.time() - cached.fetched_at < ttl_s:
        return cached

    try:
        usd_lb = fetch_copper_usd_per_lb(session)
        usd_eur = fetch_usd_eur(session)
    except (requests.RequestException, KeyError, IndexError, ValueError, TypeError):
        if cached:
            return cached
        raise

    quote = Quote(
        eur_per_kg=usd_lb_to_eur_kg(usd_lb, usd_eur),
        usd_per_lb=usd_lb,
        usd_eur=usd_eur,
        source="COMEX HG=F (Yahoo Finance) + BCE (frankfurter.app)",
        fetched_at=time.time(),
    )
    try:
        cache_path.write_text(json.dumps(asdict(quote)), encoding="utf-8")
    except OSError:
        pass
    return quote
