# ADR 004 — Pipelines de contenu séparés du bundle web

**Date** : 2024 (identifié via brownfield 2026-03-26)
**Statut** : Accepté

## Contexte

La génération des SVG de pays (Natural Earth → d3-geo → Supabase Storage) nécessite des dépendances Node.js lourdes (shapefile, topojson, pg) et un accès à des credentials Supabase admin. Ces scripts ne doivent jamais être inclus dans le bundle web.

## Décision

Pipelines dans `src/countries-pipeline/` et `src/departements-pipeline/`, compilés séparément vers `dist-countries/` et `dist-departements/` via des `tsconfig` dédiés. Exécutés avec `node`, jamais importés depuis le code web.

## Conséquences

- ✅ Bundle web léger — zéro dépendance Node.js dans le frontend
- ✅ Credentials admin isolés (`.env` côté pipeline uniquement)
- ✅ Pipelines peuvent être lancés indépendamment du serveur web
- ⚠️ Triple configuration TypeScript à maintenir (`tsconfig.json`, `tsconfig.countries.json`, `tsconfig.departements.json`)
