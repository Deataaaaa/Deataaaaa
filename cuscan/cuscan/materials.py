"""Chargement et validation de la base de matériaux (data/materials.json)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "materials.json"


@dataclass(frozen=True)
class Grade:
    key: str
    label: str
    rachat_pct: float


@dataclass(frozen=True)
class Valorisation:
    action: str
    grade: str
    kg_objet_par_heure: float


@dataclass(frozen=True)
class Material:
    key: str
    label: str
    copper_pct_min: float
    copper_pct_max: float
    grade: str
    notes: str = ""
    valorisation: Valorisation | None = None


@dataclass(frozen=True)
class Catalog:
    grades: dict[str, Grade]
    materials: dict[str, Material]

    def grade_of(self, material: Material) -> Grade:
        return self.grades[material.grade]


def _check_pct(name: str, value: float) -> None:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} doit être entre 0 et 1 (reçu {value})")


def load_catalog(path: Path | str = DEFAULT_PATH) -> Catalog:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))

    grades: dict[str, Grade] = {}
    for key, g in raw["grades"].items():
        _check_pct(f"grades.{key}.rachat_pct", g["rachat_pct"])
        grades[key] = Grade(key=key, label=g["label"], rachat_pct=g["rachat_pct"])

    materials: dict[str, Material] = {}
    for key, m in raw["materials"].items():
        lo, hi = m["copper_pct_min"], m["copper_pct_max"]
        _check_pct(f"materials.{key}.copper_pct_min", lo)
        _check_pct(f"materials.{key}.copper_pct_max", hi)
        if lo > hi:
            raise ValueError(f"materials.{key} : copper_pct_min > copper_pct_max")
        if m["grade"] not in grades:
            raise ValueError(f"materials.{key} : grade inconnu {m['grade']!r}")

        val = None
        if "valorisation" in m:
            v = m["valorisation"]
            if v["grade"] not in grades:
                raise ValueError(f"materials.{key}.valorisation : grade inconnu {v['grade']!r}")
            if v["kg_objet_par_heure"] <= 0:
                raise ValueError(f"materials.{key}.valorisation : kg_objet_par_heure doit être > 0")
            val = Valorisation(v["action"], v["grade"], v["kg_objet_par_heure"])

        materials[key] = Material(
            key=key,
            label=m["label"],
            copper_pct_min=lo,
            copper_pct_max=hi,
            grade=m["grade"],
            notes=m.get("notes", ""),
            valorisation=val,
        )

    return Catalog(grades=grades, materials=materials)
