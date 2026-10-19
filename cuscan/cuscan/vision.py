"""Identification d'un objet sur photo avec l'API Claude.

Nécessite ANTHROPIC_API_KEY (ou un profil `ant auth login`).
Le modèle peut être changé avec la variable CUSCAN_MODEL.
"""

from __future__ import annotations

import base64
import io
import json
import os
from dataclasses import dataclass

import anthropic
from PIL import Image

from .materials import Catalog

MODEL = os.environ.get("CUSCAN_MODEL", "claude-opus-5-5")
MAX_SIDE_PX = 1568
UNKNOWN = "inconnu"


class VisionError(Exception):
    pass


@dataclass(frozen=True)
class Identification:
    material_key: str  # une clé du catalogue, ou "inconnu"
    description: str
    confiance: float  # 0..1
    poids_estime_kg: float  # 0 si impossible à estimer
    teneur_cuivre_estimee: float  # avis du modèle, 0..1
    conseils: str
    suspect_infrastructure: bool
    raison_suspicion: str


def _prepare_image(data: bytes) -> str:
    """Redimensionne et ré-encode en JPEG base64 (formats téléphone, poids)."""
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as e:  # Pillow lève des types variés selon le format
        raise VisionError(f"Image illisible : {e}") from e
    img = img.convert("RGB")
    img.thumbnail((MAX_SIDE_PX, MAX_SIDE_PX))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.standard_b64encode(buf.getvalue()).decode("ascii")


def _schema(keys: list[str]) -> dict:
    return {
        "type": "object",
        "properties": {
            "material_key": {"type": "string", "enum": keys + [UNKNOWN]},
            "description": {"type": "string"},
            "confiance": {"type": "number"},
            "poids_estime_kg": {"type": "number"},
            "teneur_cuivre_estimee": {"type": "number"},
            "conseils": {"type": "string"},
            "suspect_infrastructure": {"type": "boolean"},
            "raison_suspicion": {"type": "string"},
        },
        "required": [
            "material_key",
            "description",
            "confiance",
            "poids_estime_kg",
            "teneur_cuivre_estimee",
            "conseils",
            "suspect_infrastructure",
            "raison_suspicion",
        ],
        "additionalProperties": False,
    }


def _prompt(catalog: Catalog) -> str:
    lines = "\n".join(
        f"- {m.key} : {m.label} (teneur indicative {m.copper_pct_min:.0%}–{m.copper_pct_max:.0%})"
        for m in catalog.materials.values()
    )
    return f"""Tu aides un particulier à évaluer le cuivre récupérable dans un objet qu'il possède ou envisage d'acheter, pour le revendre à un ferrailleur.

Catégories connues :
{lines}

À partir des photos :
1. Choisis la catégorie la plus proche dans material_key, ou "{UNKNOWN}" si aucune ne convient.
2. description : ce que tu vois, en une ou deux phrases (type d'objet, section du câble si visible, couleur du métal, présence d'aluminium).
3. confiance : entre 0 et 1.
4. poids_estime_kg : estimation grossière à partir de la taille apparente, ou 0 si impossible. L'utilisateur pèsera de toute façon.
5. teneur_cuivre_estimee : ta propre estimation entre 0 et 1, en tenant compte de ce que tu vois (par ex. un câble à gaine épaisse a une teneur plus basse).
6. conseils : 1 à 3 conseils concrets pour valoriser cet objet précis (tri, démontage, pièges comme un bobinage en aluminium).
7. suspect_infrastructure : true si l'objet ressemble à du matériel de réseau public ou d'entreprise (câble de signalisation ferroviaire, câble télécom de réseau, câble de mise à la terre de pylône, plaque de regard, câble avec marquage d'opérateur…), qui pourrait provenir d'un vol. raison_suspicion : explique pourquoi, ou chaîne vide.

Réponds en français."""


def identify(images: list[bytes], catalog: Catalog, client: anthropic.Anthropic | None = None) -> Identification:
    if not images:
        raise VisionError("Aucune image fournie")
    client = client or anthropic.Anthropic()

    content: list[dict] = [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": _prepare_image(b)}}
        for b in images[:5]
    ]
    content.append({"type": "text", "text": _prompt(catalog)})

    try:
        response = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={
                "effort": "medium",
                "format": {"type": "json_schema", "schema": _schema(list(catalog.materials))},
            },
            messages=[{"role": "user", "content": content}],
        )
    except anthropic.AuthenticationError as e:
        raise VisionError("Clé API Anthropic absente ou invalide (ANTHROPIC_API_KEY).") from e
    except anthropic.RateLimitError as e:
        raise VisionError("Limite de requêtes atteinte, réessayez dans un instant.") from e
    except anthropic.APIStatusError as e:
        raise VisionError(f"Erreur de l'API ({e.status_code}) : {e.message}") from e
    except anthropic.APIConnectionError as e:
        raise VisionError("Impossible de joindre l'API Anthropic.") from e

    if response.stop_reason == "refusal":
        raise VisionError("Le modèle a refusé d'analyser ces images.")
    if response.stop_reason == "max_tokens":
        raise VisionError("Réponse tronquée, réessayez.")

    text = next((b.text for b in response.content if b.type == "text"), None)
    if text is None:
        raise VisionError("Réponse vide du modèle.")
    data = json.loads(text)

    def clamp(x: float) -> float:
        return max(0.0, min(1.0, float(x)))

    return Identification(
        material_key=data["material_key"],
        description=data["description"],
        confiance=clamp(data["confiance"]),
        poids_estime_kg=max(0.0, float(data["poids_estime_kg"])),
        teneur_cuivre_estimee=clamp(data["teneur_cuivre_estimee"]),
        conseils=data["conseils"],
        suspect_infrastructure=bool(data["suspect_infrastructure"]),
        raison_suspicion=data["raison_suspicion"],
    )
