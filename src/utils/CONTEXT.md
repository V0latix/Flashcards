# Module : utils

## Responsabilité

Utilitaires purs sans état, réutilisables dans toute l'app. Zéro dépendance vers les autres modules métier.

## Structure interne

```
src/utils/
├── date.ts          → normalizeToDateKey, normalizeTodayKey, addDays — format YYYY-MM-DD
├── date.test.ts     → Tests unitaires dates
├── tagTree.ts       → Parsing/rendu des tags hiérarchiques (geo/europe/france)
├── tagTree.test.ts  → Tests tags
├── training.ts      → Probabilité de reverse Q/A
├── training.test.ts → Tests training
├── media.ts         → Helpers Blob (URL.createObjectURL, détection mime)
├── media.test.ts    → Tests media
├── export.ts        → Sérialisation/désérialisation import-export JSON
└── supabase.ts      → Helper URL Supabase Storage
```

## Conventions spécifiques

- **Dates** : toujours `normalizeToDateKey(isoString)` → `"YYYY-MM-DD"`. Ne jamais comparer des ISO strings directement pour les dates de révision
- **Tags** : séparateur `/`, ex: `"geo/europe/france"` → arbre `{geo: {europe: {france: {}}}}`
- Aucune fonction dans `utils/` ne doit importer depuis `db/`, `sync/`, `leitner/` ou `routes/`

## Points d'attention

- `addDays("2024-01-31", 1)` = `"2024-02-01"` — utilise la logique Date JS (attention DST)
- `media.ts` utilise `URL.createObjectURL` — ne fonctionne qu'en environnement browser (pas Node.js)
