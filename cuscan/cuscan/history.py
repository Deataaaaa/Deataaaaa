"""Historique local des estimations (SQLite)."""

from __future__ import annotations

import os
import sqlite3
import time
from pathlib import Path

DEFAULT_DB = Path(os.environ.get("CUSCAN_DB", Path(__file__).resolve().parent.parent / "data" / "historique.db"))

COLUMNS = [
    "id",
    "date",
    "objet",
    "description",
    "poids_kg",
    "teneur_min",
    "teneur_max",
    "cours_eur_kg",
    "rachat_pct",
    "prix_achat",
    "valeur_nette_min",
    "valeur_nette_max",
    "marge_min",
    "marge_max",
]


def _connect(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS estimations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            objet TEXT NOT NULL,
            description TEXT,
            poids_kg REAL NOT NULL,
            teneur_min REAL NOT NULL,
            teneur_max REAL NOT NULL,
            cours_eur_kg REAL NOT NULL,
            rachat_pct REAL NOT NULL,
            prix_achat REAL NOT NULL,
            valeur_nette_min REAL NOT NULL,
            valeur_nette_max REAL NOT NULL,
            marge_min REAL NOT NULL,
            marge_max REAL NOT NULL
        )"""
    )
    return conn


def save(row: dict, path: Path = DEFAULT_DB) -> None:
    row = {**row, "date": row.get("date") or time.strftime("%Y-%m-%d %H:%M")}
    cols = [c for c in COLUMNS if c != "id"]
    with _connect(path) as conn:
        conn.execute(
            f"INSERT INTO estimations ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})",
            [row.get(c) for c in cols],
        )


def load_all(path: Path = DEFAULT_DB) -> list[dict]:
    with _connect(path) as conn:
        cur = conn.execute(f"SELECT {', '.join(COLUMNS)} FROM estimations ORDER BY id DESC")
        return [dict(zip(COLUMNS, r)) for r in cur.fetchall()]


def delete(row_id: int, path: Path = DEFAULT_DB) -> None:
    with _connect(path) as conn:
        conn.execute("DELETE FROM estimations WHERE id = ?", (row_id,))
