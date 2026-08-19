# Plans d'atelier — Brasero Bigorneau V24

Le guide de montage d'origine (PDF) redessiné en **17 planches format A3** dans le style
d'un plan de fabrication : cadre ISO avec zones, cartouche, nomenclature à repères,
cotes fléchées, hachures de coupe et symboles de soudure ISO 2553.

## Contenu

| Planche | Étape | Objet |
|---|---|---|
| F.00 | — | Vue d'ensemble, nomenclature générale, gamme de montage |
| F.01 | 0 + 1 | Repérage et traçage des parois, réglette gabarit |
| F.02 | 2 | Demi-caisson ouvert (3 parois sur le fond) |
| F.03 | 3 | Rails de tiroir |
| F.04 | 4 | Cornières A5 (porte-grille) |
| F.05 | 4 bis | Cadre réducteur A5b |
| F.06 | 5 | Traverses range-bûches |
| F.07 | 6 | Préparation de la face avant à plat |
| F.08 | 7 | Fermeture du caisson et pieds |
| F.09 | 8 | Cadre haut A4 |
| F.10 | 9 | Pyramide tronquée |
| F.11 | 10 | Plancha, jupe et nervures INOX |
| F.12 | 10 bis | Fabrication des poignées |
| F.13 | 11 | Tiroir cendrier, registre, poignée |
| F.14 | 12 | Pose des poignées de transport |
| F.15 | 13 | Finitions : peinture, isolation, bardage |
| F.16 | — | Synthèse : toutes les cotes Z, débit, contrôle final |

## Corrections apportées au guide d'origine

1. **Pyramide (F.10)** — la cote 232 du guide est la longueur du *côté oblique* du trapèze,
   pas sa hauteur. La hauteur du panneau à plat vaut **195,4 mm**. Débité à 232, l'assemblage
   ne ferme pas.
2. **Tiroir (F.13)** — le développé annoncé (620×300) ne correspond pas aux hauteurs de
   pliage décrites, et un bac de 460 ne passe pas dans une ouverture de 460. Jeux ajoutés.
3. **Cornière A5b (F.05)** — la coupe d'origine porte deux cotes (586 et 591). Le repère
   retenu est celui de toutes les autres étapes : dessus de l'aile du A5 = Z 591.

## Régénérer

```
python3 build.py plans.html
```

`draw.py` contient le moteur de tracé (cadre, cartouche, cotation, symboles de soudure,
projection isométrique) ; `sheets_a/b/c.py` le contenu des planches ; `build.py` assemble
la page HTML. Aucune dépendance externe.
