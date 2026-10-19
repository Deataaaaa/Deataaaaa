# CuScan

CuScan estime le cuivre contenu dans un objet à partir d'une photo et d'une pesée. Il calcule sa valeur de revente, la compare au prix d'achat et donne des conseils pour revendre vite.

> Toutes les valeurs sont **indicatives**. Calibrez `data/materials.json` avec vos propres pesées et les tickets de vos ferrailleurs.

## Installation

```bash
cd cuscan
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...   # facultatif : identification automatique par photo
streamlit run app.py
```

Sans clé API, l'app fonctionne quand même : vous choisissez le type d'objet à la main.
Sur téléphone, ouvrez l'adresse affichée par Streamlit (même réseau Wi-Fi) et utilisez la caméra.

## Fonctionnement

1. **Photo** : Claude identifie l'objet, propose une catégorie, une teneur et un poids approximatif. Il signale aussi le matériel qui ressemble à de l'infrastructure publique (câble SNCF, télécom…).
2. **Poids et prix d'achat** : la pesée réelle reste indispensable.
3. **Cours** : COMEX (Yahoo Finance) converti en €/kg avec le taux BCE, mis en cache une heure. Une saisie manuelle est possible.
4. **Calcul** (`cuscan/calc.py`) :

```
masse_cuivre = poids × teneur
valeur_brute = masse_cuivre × cours × rachat_grade
valeur_nette = valeur_brute − frais_fixes − frais_% × valeur_brute
marge        = valeur_nette − prix_achat
ratio        = valeur_nette / prix_achat
cours_seuil  = (prix_achat + frais_fixes) / (poids × teneur × rachat × (1 − frais_%))
```

Chaque résultat est donné en fourchette (teneur min et max).

5. **Valorisation** : pour les câbles, moteurs et transformateurs, l'app compare la vente en l'état et la vente après dénudage ou démontage, en tenant compte de la valeur de votre temps.
6. **Historique** : il est stocké dans SQLite (`data/historique.db`), avec un export CSV et le total du stock.

## Fichiers

| Fichier | Rôle |
|---|---|
| `data/materials.json` | Teneurs et grades, modifiables sans toucher au code |
| `cuscan/calc.py` | Calculs (fonctions pures) |
| `cuscan/prices.py` | Cours du cuivre et cache |
| `cuscan/vision.py` | Identification par photo (API Claude) |
| `cuscan/advice.py` | Conseils de revente |
| `cuscan/history.py` | Historique |
| `app.py` | Interface Streamlit |

Variables d'environnement : `ANTHROPIC_API_KEY`, `CUSCAN_MODEL` (par défaut `claude-opus-5-5`), `CUSCAN_DB`.

## Version web (téléphone)

`web/cuscan.html` est une page autonome publiée comme Artifact claude.ai, utilisable depuis un téléphone. Une photo suffit : Claude identifie l'objet et estime son poids, sa teneur en cuivre et le prix s'il est visible. La page applique le cours du jour, choisit entre vendre en l'état ou dénuder/démonter, puis donne le verdict (« Oui, ça vaut le coup », « Risqué », « Non… ») ou, sans prix connu, le prix maximum à payer. Chaque scan est enregistré dans l'historique privé de l'utilisateur.

## Tests

```bash
python -m pytest
```

## Cadre légal

- En France, le paiement en espèces des métaux est interdit et le ferrailleur doit relever l'identité du vendeur.
- Le recel de métaux volés est un délit. N'achetez pas de câbles ou de pièces de réseau public sans preuve d'origine.
- Les fluides frigorigènes (frigos, clims) doivent être récupérés par un professionnel.
