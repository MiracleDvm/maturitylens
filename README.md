# MaturityLens

[![CI](https://github.com/<votre-compte>/maturitylens/actions/workflows/ci.yml/badge.svg)](https://github.com/<votre-compte>/maturitylens/actions/workflows/ci.yml)

**Démo en ligne : https://<votre-compte>.github.io/maturitylens/**

MaturityLens est un outil web d'auto-évaluation qui mesure en une séance d'environ 30 minutes la maturité d'un Système de Management de la Sécurité de l'Information (SMSI) face à ISO/IEC 27001:2022, puis produit des écarts priorisés et un plan d'action.

## Objectif

Avant un projet ISO 27001, une organisation doit savoir où elle en est. Ce pré-diagnostic (*gap analysis*) se fait souvent dans un tableur : long à remplir, difficile à prioriser, peu lisible pour une direction. MaturityLens structure l'entretien (117 points couvrant les clauses 4 à 10 et les 93 mesures de l'Annexe A), calcule la maturité et les écarts de façon explicable, et produit un rapport présentable à une direction.

## Fonctionnalités

- Questionnaire complet, échelle de maturité 0-5 + N/A, note libre par item.
- Calcul automatique de la maturité, des écarts priorisés et d'un plan d'action en trois horizons (0-3, 3-6, 6-12 mois).
- Indicateur de préparation à la certification (clauses 4 à 10 toutes ≥ niveau cible).
- Radar SVG à 11 axes, tableaux de synthèse par domaine.
- Export Markdown, impression PDF, export/import JSON (session complète, réimportable).
- Import de constats techniques d'un scanner (projet compagnon [iso-audit](#)) rattachés automatiquement à la mesure concernée.
- Fonctionnement **100 % local** : aucune donnée ne quitte le navigateur, aucune requête réseau après le chargement de la page.

## Utiliser l'outil

Ouvrir `index.html` directement dans un navigateur (double-clic, fonctionne en `file://`), ou visiter la démo en ligne. Cliquer sur « Charger un exemple » pour explorer l'outil avec des données fictives.

## Développement

Zéro dépendance d'exécution, zéro build. HTML/CSS/JavaScript pur (modules IIFE).

```bash
node --test            # lance les tests (référentiel, moteur de calcul, rapports)
python3 -m http.server 8000   # sert l'application en local
```

`node --test` est la seule dépendance d'outillage (Node.js), utilisée uniquement en développement. Elle n'est jamais livrée au navigateur.

### Structure

```
index.html              structure de la page, charge les 4 scripts
css/style.css           écran, mobile, impression
js/
  referentiel.js        117 items (24 clauses + 93 mesures Annexe A), échelle
  scoring.js             calculs purs (maturité, écarts, priorités, horizons, certification)
  report.js              rapport Markdown, export/import JSON, import de constats
  app.js                  interface, état, événements, radar SVG, sauvegarde locale
tests/                  tests node:test
docs/                   dossier de conception, exemple de constats pour l'import
```

## Limites

- Évaluation **déclarative et indicative** : elle ne constitue ni une certification ni une attestation de conformité ISO/IEC 27001. L'avertissement est visible à l'écran, dans le rapport et à l'impression.
- Pas de compte utilisateur, de serveur ni de base de données : les données sont perdues si le navigateur est vidé sans export JSON préalable.
- Le texte des questions et recommandations est une reformulation libre ; il ne reproduit pas le texte protégé par le droit d'auteur de la norme ISO/IEC 27001.
- Les criticités par défaut sont un point de départ, à ajuster selon l'analyse de risques propre à chaque organisation.

## Auteur

Vignon Miracle DOSSOU

## Licence

MIT. Voir [LICENSE](LICENSE).
