# Module : db

## Responsabilité

Couche de persistance locale. Définit le schéma IndexedDB (via Dexie), les types TypeScript des entités, et les requêtes partagées.

## Structure interne

```
src/db/
├── index.ts    → Instance Dexie (FlashcardsDB), schéma versionné (9 versions), migrations
├── types.ts    → Card, ReviewState, ReviewLog, Media, MediaSide
└── queries.ts  → Requêtes Dexie réutilisables
```

## Schéma (version actuelle : 9)

| Table | PK | Index notables |
|---|---|---|
| `cards` | `++id` | `created_at`, `updated_at`, `[source+source_id]` |
| `reviewStates` | `card_id` | `box`, `due_date` |
| `reviewLogs` | `++id` | `card_id`, `timestamp` |
| `media` | `++id` | `card_id`, `side` |

## Dépendances clés

- Dépend de : `dexie` (IndexedDB wrapper)
- Utilisé par : tous les modules (`leitner`, `sync`, `routes`, `stats`, `utils`)

## Conventions spécifiques

- **Instance singleton** importée depuis `'../db'` — ne jamais créer une nouvelle instance
- **Migrations** : chaque `version(n)` doit avoir un `.upgrade()` si des champs changent
- **Tests** : utiliser `fake-indexeddb/auto` (chargé dans `src/test/setup.ts`) + `db.delete(); db.open()` entre les tests
- `Media.blob` est un vrai `Blob` stocké en binaire dans IndexedDB — ne pas sérialiser en base64

## Points d'attention

- La suppression d'une carte doit aussi supprimer ses `reviewStates`, `reviewLogs` et `media` (transaction)
- `reviewStates.card_id` est la PK — `bulkPut` sur reviewStates utilise `card_id` comme clé
- Le schéma version 1 avait un champ `deck_id` supprimé en version 2 — ne pas le réintroduire
