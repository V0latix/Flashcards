# Module : routes

## Responsabilité

Pages React Router. Chaque fichier = une route. Contient la UI et orchestre les appels vers `leitner/`, `db/`, `sync/`.

## Structure interne

```
src/routes/
├── Home.tsx / Home.test.tsx           → Dashboard : session du jour, streak, stats rapides
├── ReviewSession.tsx / *.test.tsx     → Player de révision (orchestrateur léger, ~175 lignes)
├── Library.tsx / Library.test.tsx     → Navigateur de cartes (orchestrateur léger, ~190 lignes)
├── CardEditor.tsx / CardEditor.test.tsx → Formulaire création/édition carte (Markdown preview)
├── Packs.tsx / Packs.test.tsx         → Liste des packs publics Supabase
├── PackDetail.tsx                     → Détail d'un pack + import
├── StatsPage.tsx                      → Graphiques progression (recharts ou SVG natif)
├── Settings.tsx / Settings.test.tsx   → Config Leitner + auth + sync
├── ImportExport.tsx                   → Import/export JSON
├── library/                           → Hooks + sous-composants de Library
│   ├── useLibraryCards.ts             → Chargement des cartes (loadCards, isLoading)
│   ├── useLibraryFilters.ts           → Filtres tag/boîte/texte + pagination + breadcrumb
│   ├── useCardDeletion.ts             → Modale + logique suppression carte individuelle
│   ├── useTagDeletion.ts              → Modale + logique suppression par tag
│   ├── useCardExport.ts               → Export JSON avec médias
│   ├── BoxFilterBar.tsx               → Barre de filtres par boîte (0–5 + suspended)
│   └── CardListItem.tsx               → Ligne de carte dans la liste
└── review/                            → Hooks + sous-composants de ReviewSession
    ├── types.ts                       → Type SessionCard
    ├── trainingQueue.ts               → loadTrainingQueue, normalizeTrainingIds
    ├── useReviewFilters.ts            → Parsing URL params (tag/box/mode)
    ├── useSessionLoader.ts            → Chargement session (training ou daily) + shuffle
    ├── useCardMutation.ts             → Suppression / suspension en cours de session
    ├── useReviewKeyboard.ts           → Raccourcis clavier (Space, H, ←, →)
    ├── useScrollReset.ts              → Remise à zéro du scroll sur changement de carte
    ├── SessionComplete.tsx            → Écran de fin (résumé bon/mauvais)
    └── ReviewCard.tsx                 → Carte active (stack recto/verso + actions + préchargement)
```

## Patterns utilisés

- **React Router 7** : `<Outlet>` dans `AppShell`, pages dans `createBrowserRouter`
- **Pas de state management global** : données lues directement depuis Dexie via hooks ou `useEffect`
- **Optimistic UI** : mutations locales d'abord, sync en arrière-plan
- **Hooks colocalisés** : les hooks propres à une route vivent dans un sous-dossier `routes/<nom>/` (ex: `routes/library/`, `routes/review/`)

## Dépendances clés

- Dépend de : `src/db`, `src/leitner`, `src/sync/queue`, `src/components`, `src/i18n`
- Utilisé par : router principal (`src/main.tsx` ou équivalent)

## Conventions spécifiques

- Appeler `markLocalChange()` après toute mutation Dexie dans les routes
- Utiliser `useI18n()` pour tous les textes visibles — jamais de strings UI hardcodées
- Les routes de test (`.test.tsx`) sont des smoke tests de rendu, pas des tests d'intégration complets

## Points d'attention

- `ReviewSession` doit appeler `applyReviewResult` avec `today` calculé côté client — pas de Date côté serveur
- `CardEditor` reçoit `id` optionnel en param — mode création vs édition dans le même composant
- `PackDetail` vérifie `source_type='supabase_public'` pour l'idempotence à l'import
