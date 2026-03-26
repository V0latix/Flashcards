# Module : routes

## Responsabilité

Pages React Router. Chaque fichier = une route. Contient la UI et orchestre les appels vers `leitner/`, `db/`, `sync/`.

## Structure interne

```
src/routes/
├── Home.tsx / Home.test.tsx           → Dashboard : session du jour, streak, stats rapides
├── ReviewSession.tsx / *.test.tsx     → Player de révision (affiche recto, attend réponse, appelle applyReviewResult)
├── Library.tsx / Library.test.tsx     → Navigateur de cartes avec filtres tags/boîtes/texte
├── CardEditor.tsx / CardEditor.test.tsx → Formulaire création/édition carte (Markdown preview)
├── Packs.tsx / Packs.test.tsx         → Liste des packs publics Supabase
├── PackDetail.tsx                     → Détail d'un pack + import
├── StatsPage.tsx                      → Graphiques progression (recharts ou SVG natif)
├── Settings.tsx / Settings.test.tsx   → Config Leitner + auth + sync
└── ImportExport.tsx                   → Import/export JSON
```

## Patterns utilisés

- **React Router 7** : `<Outlet>` dans `AppShell`, pages dans `createBrowserRouter`
- **Pas de state management global** : données lues directement depuis Dexie via hooks ou `useEffect`
- **Optimistic UI** : mutations locales d'abord, sync en arrière-plan

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
