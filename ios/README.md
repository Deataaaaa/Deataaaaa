# Pécule

Une application iOS pour les indépendants en micro-entreprise.

## Le problème

Un indépendant encaisse du brut. Sur 1 000 € reçus, entre 130 € et 490 € ne lui
appartiennent pas : cotisations URSSAF, formation professionnelle, impôt, TVA
quand il y est assujetti. Le problème n'est pas de connaître les taux, c'est de
ne pas dépenser l'argent qui repartira. On le découvre au moment de la
déclaration, quand la trésorerie est déjà partie.

Deuxième angle mort : les seuils. Franchir la franchise en base de TVA oblige à
facturer la TVA — souvent découvert après coup, quand il est trop tard pour la
refacturer aux clients.

## Ce que fait l'application

- **Décompose chaque encaissement** entre ce qui est provisionné et ce qui est
  réellement disponible, avec le détail poste par poste.
- **Surveille les seuils** (franchise de TVA, seuil majoré, plafond micro) avec
  une projection de la date de franchissement au rythme constaté.
- **Sort les échéances** URSSAF, TVA et CFE avec, sur chacune, le montant estimé
  à partir des encaissements réels — pas juste une date.
- **Saisie en langage naturel** : « Dupont 1 250,50 € facture 2026-014 hier »
  remplit les quatre champs. Déterministe, hors ligne, sans latence.
- **Projections** : moyenne mensuelle, chiffre d'affaires de fin d'année,
  répartition par client (un client à 70 % du CA est un risque, pas un succès).

Aucun compte, aucun serveur, aucune connexion bancaire : les données restent sur
l'appareil.

## Avertissement sur les taux

Les taux de cotisations, plafonds et seuils fournis par défaut sont des
**repères indicatifs, pas une source officielle**, et ils changent
régulièrement. L'application est construite pour que chaque valeur soit
modifiable dans **Réglages → Vérifier et ajuster les taux** : ce sont les
valeurs de l'utilisateur qui servent aux calculs. Le calcul de l'impôt au barème
est une estimation qui ignore le reste du foyer fiscal.

## Architecture

```
ios/
├── Packages/PeculeCore/     Coeur métier : Swift pur, aucune dépendance à UIKit,
│   ├── Sources/             SwiftUI ou SwiftData. Testable partout.
│   └── Tests/               Une centaine d'assertions.
├── Pecule/                  L'application SwiftUI.
│   ├── Model/               Persistance SwiftData + passerelle vers le coeur.
│   ├── Features/            Un dossier par écran.
│   └── Support/             Formatage et composants partagés.
└── Pecule.xcodeproj
```

La séparation est délibérée : **tout ce qui calcule vit dans `PeculeCore`**, qui
ne connaît ni les vues ni la base de données. C'est ce qui permet de vérifier la
totalité de la logique fiscale sans simulateur, en quelques secondes, y compris
en intégration continue.

Deux choix qui structurent le reste :

- **`Decimal` partout, jamais `Double`.** Sur de l'argent, le binaire flottant
  dérive. Les taux constants se construisent en points de base entiers
  (`Rate(basisPoints: 2120)`) plutôt qu'en littéraux flottants, qui
  réintroduiraient l'erreur par la conversion depuis `Double`.
- **Une seule source de vérité pour les chiffres**, la structure `Ledger` : tous
  les écrans lisent les mêmes calculs, il n'existe pas deux façons d'obtenir un
  montant.

## Développer

Cible : **iOS 26**, **Swift 6** (mode strict), SwiftUI, SwiftData, Swift Charts,
StoreKit 2.

```bash
# Coeur métier : rapide, sans simulateur
cd ios/Packages/PeculeCore && swift test

# Application complète
xcodebuild build -project ios/Pecule.xcodeproj -scheme Pecule \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO
```

Le projet utilise les **dossiers synchronisés** d'Xcode 16+ : ajouter un fichier
dans `Pecule/` suffit, il n'y a jamais de `.pbxproj` à modifier.

L'intégration continue (`.github/workflows/ios.yml`) lance ces deux commandes sur
un runner macOS à chaque push. C'est ce qui permet de développer sans Mac : la
compilation et les tests sont vérifiés à distance.

## Abonnement

Gratuit jusqu'à 30 encaissements, puis abonnement mensuel ou annuel via
StoreKit 2. Les identifiants produits (`com.deataaaaa.pecule.pro.*`) doivent être
déclarés sur App Store Connect ; tant qu'ils ne le sont pas, l'écran d'abonnement
l'annonce explicitement au lieu d'afficher une liste vide.
