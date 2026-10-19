"""Calculs de valeur et de rentabilité. Fonctions pures, sans entrée/sortie.

Conventions :
- pourcentages exprimés entre 0 et 1 ;
- prix du cuivre en €/kg de cuivre pur ;
- frais_pct appliqué à la valeur brute (commission, décote de tri…) ;
- frais_fixes en € (transport, carburant…).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Costs:
    frais_fixes: float = 0.0
    frais_pct: float = 0.0


@dataclass(frozen=True)
class Point:
    """Résultat pour une teneur en cuivre donnée."""

    copper_pct: float
    masse_cuivre_kg: float
    valeur_brute: float
    frais: float
    valeur_nette: float
    marge: float
    ratio: float | None  # None si prix d'achat nul (objet gratuit)


@dataclass(frozen=True)
class Estimate:
    low: Point
    high: Point
    prix_seuil_min: float | None  # cours €/kg à partir duquel on rentre dans ses frais, hypothèse haute
    prix_seuil_max: float | None  # idem, hypothèse basse (teneur min)


def _validate(poids_kg: float, prix_cuivre: float, rachat_pct: float, prix_achat: float, costs: Costs) -> None:
    if poids_kg < 0:
        raise ValueError("Le poids ne peut pas être négatif")
    if prix_cuivre < 0:
        raise ValueError("Le cours du cuivre ne peut pas être négatif")
    if not 0 <= rachat_pct <= 1:
        raise ValueError("rachat_pct doit être entre 0 et 1")
    if prix_achat < 0:
        raise ValueError("Le prix d'achat ne peut pas être négatif")
    if costs.frais_fixes < 0 or not 0 <= costs.frais_pct < 1:
        raise ValueError("Frais invalides")


def point(
    poids_kg: float,
    copper_pct: float,
    prix_cuivre: float,
    rachat_pct: float,
    prix_achat: float,
    costs: Costs = Costs(),
) -> Point:
    _validate(poids_kg, prix_cuivre, rachat_pct, prix_achat, costs)
    if not 0 <= copper_pct <= 1:
        raise ValueError("La teneur en cuivre doit être entre 0 et 1")

    masse = poids_kg * copper_pct
    brute = masse * prix_cuivre * rachat_pct
    frais = costs.frais_fixes + brute * costs.frais_pct
    nette = brute - frais
    return Point(
        copper_pct=copper_pct,
        masse_cuivre_kg=masse,
        valeur_brute=brute,
        frais=frais,
        valeur_nette=nette,
        marge=nette - prix_achat,
        ratio=nette / prix_achat if prix_achat > 0 else None,
    )


def prix_seuil(
    poids_kg: float,
    copper_pct: float,
    rachat_pct: float,
    prix_achat: float,
    costs: Costs = Costs(),
) -> float | None:
    """Cours du cuivre (€/kg) pour lequel valeur nette = prix d'achat.

    None si l'objet ne contient pas de cuivre valorisable (le seuil est infini).
    """
    denom = poids_kg * copper_pct * rachat_pct * (1 - costs.frais_pct)
    if denom <= 0:
        return None
    return (prix_achat + costs.frais_fixes) / denom


def estimate(
    poids_kg: float,
    copper_pct_min: float,
    copper_pct_max: float,
    prix_cuivre: float,
    rachat_pct: float,
    prix_achat: float,
    costs: Costs = Costs(),
) -> Estimate:
    if copper_pct_min > copper_pct_max:
        raise ValueError("copper_pct_min > copper_pct_max")
    args = (prix_cuivre, rachat_pct, prix_achat, costs)
    return Estimate(
        low=point(poids_kg, copper_pct_min, *args),
        high=point(poids_kg, copper_pct_max, *args),
        prix_seuil_min=prix_seuil(poids_kg, copper_pct_max, rachat_pct, prix_achat, costs),
        prix_seuil_max=prix_seuil(poids_kg, copper_pct_min, rachat_pct, prix_achat, costs),
    )


@dataclass(frozen=True)
class Upgrade:
    """Gain d'une opération de valorisation (dénudage, démontage…)."""

    heures: float
    gain_brut_low: float
    gain_brut_high: float
    cout_temps: float

    @property
    def gain_net_low(self) -> float:
        return self.gain_brut_low - self.cout_temps

    @property
    def gain_net_high(self) -> float:
        return self.gain_brut_high - self.cout_temps


def upgrade(
    poids_kg: float,
    copper_pct_min: float,
    copper_pct_max: float,
    prix_cuivre: float,
    rachat_actuel: float,
    rachat_apres: float,
    kg_objet_par_heure: float,
    taux_horaire: float,
    costs: Costs = Costs(),
) -> Upgrade:
    """Compare la vente en l'état et la vente après valorisation.

    Le cuivre contenu ne change pas : seul le grade (donc rachat_pct) change,
    au prix du temps passé.
    """
    if kg_objet_par_heure <= 0:
        raise ValueError("kg_objet_par_heure doit être > 0")
    if taux_horaire < 0:
        raise ValueError("Le taux horaire ne peut pas être négatif")
    delta = (rachat_apres - rachat_actuel) * prix_cuivre * (1 - costs.frais_pct)
    heures = poids_kg / kg_objet_par_heure
    return Upgrade(
        heures=heures,
        gain_brut_low=poids_kg * copper_pct_min * delta,
        gain_brut_high=poids_kg * copper_pct_max * delta,
        cout_temps=heures * taux_horaire,
    )
