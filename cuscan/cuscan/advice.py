"""Conseils de revente, générés par règles simples à partir de l'estimation."""

from __future__ import annotations

from .calc import Estimate, Upgrade
from .materials import Grade, Material

GENERIQUES = [
    "Pesez sur une balance fiable avant de partir, et gardez le ticket de pesée du ferrailleur pour comparer.",
    "Appelez 2 ou 3 ferrailleurs avant de vous déplacer : le prix au kilo d'un même grade varie souvent beaucoup d'un site à l'autre.",
    "Un lot trié et propre (sans fer, plastique ni terre) est classé dans un meilleur grade.",
]

LEGAL = (
    "En France, le paiement des métaux en espèces est interdit : le ferrailleur paie par virement ou chèque "
    "et doit relever votre pièce d'identité. Prévoyez-la, et vérifiez les règles si vous êtes dans un autre pays."
)


def advise(
    material: Material,
    grade: Grade,
    est: Estimate,
    prix_achat: float,
    upg: Upgrade | None = None,
    upg_grade: Grade | None = None,
) -> list[str]:
    out: list[str] = []

    if prix_achat > 0:
        if est.high.marge < 0:
            out.append(
                "À ce prix, l'achat est perdant même avec la teneur la plus haute. "
                "Négociez ou passez votre tour."
            )
        elif est.low.marge < 0:
            out.append(
                "L'achat n'est rentable que si la teneur est dans le haut de la fourchette. "
                "Pesez ou démontez un échantillon avant d'en acheter beaucoup."
            )
        else:
            out.append("L'achat est rentable sur toute la fourchette de teneur estimée.")

    if est.high.valeur_nette <= 0:
        out.append("Les frais dépassent la valeur du cuivre : regroupez ce lot avec d'autres avant de vous déplacer.")

    if upg and upg_grade and material.valorisation:
        action = material.valorisation.action
        if upg.gain_net_low > 0:
            out.append(
                f"{action} rapporte environ {upg.gain_net_low:.2f} à {upg.gain_net_high:.2f} € de plus "
                f"pour {upg.heures:.1f} h de travail (passage en « {upg_grade.label} »). Ça vaut le coup."
            )
        elif upg.gain_net_high > 0:
            out.append(
                f"{action} n'est rentable que si la teneur est haute : de {upg.gain_net_low:.2f} à "
                f"{upg.gain_net_high:.2f} € pour {upg.heures:.1f} h. Pour vendre vite, vendez en l'état."
            )
        else:
            out.append(
                f"{action} ne compense pas le temps passé ({upg.heures:.1f} h) : vendez en l'état "
                f"en « {grade.label} », c'est le plus rapide."
            )
    else:
        out.append(f"Vendez directement en « {grade.label} », c'est le plus rapide.")

    if material.notes:
        out.append(material.notes)

    out.extend(GENERIQUES)
    out.append(LEGAL)
    return out
