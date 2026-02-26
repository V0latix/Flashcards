# TODO - Ameliorations app Flashcards

## P0 (priorite haute)

- [x] Reinitialiser completement l'etat de session quand `tag` ou `mode` change dans `src/routes/ReviewSession.tsx` (reset `index`, `goodCount`, `badCount`, `showBack`, `isDeleteOpen`).
- [x] Corriger la securite Markdown dans `src/components/MarkdownRenderer.tsx` en retirant ou encadrant `urlTransform={(uri) => uri}`.

## P1 (priorite produit)

- [x] Faire en sorte que le mode training respecte les filtres actifs (utiliser `filteredCards` ou `selectedCardIds`) dans `src/routes/Library.tsx`.
- [x] Ajouter l'affichage de `hint_md` en session de review (bouton "Indice" + raccourci clavier) dans `src/routes/ReviewSession.tsx`.
- [x] Implementer la suspension de cartes (`suspended`) avec actions UI et exclusion dans le moteur de session (`src/db/types.ts`, `src/leitner/engine.ts`, `src/routes/Library.tsx`).
- [x] Finaliser la logique "box1 target" (brancher `autoFillBox1` ou simplifier les restes de code) dans `src/leitner/engine.ts`.

## P2 (qualite UX/accessibilite)

- [x] Ameliorer le menu "Add" (Escape, click outside, focus management) et l'etat actif des routes dynamiques dans `src/components/AppShell.tsx`.
- [x] Rendre la modale auth plus robuste (Escape, click backdrop, focus trap) dans `src/auth/AuthButton.tsx`.
- [x] Internationaliser les chaines en dur restantes (`Tags`, `Image introuvable`, legende chart, etc.) dans `src/routes/Library.tsx`, `src/components/MarkdownRenderer.tsx`, `src/routes/StatsPage.tsx`.
- [x] Enrichir la page packs (description, tags, nombre de cartes, import direct) dans `src/routes/Packs.tsx`.

## P3 (audit technique: doublons / inutile)

- [x] Supprimer les checks DB/Supabase au boot en production (garder uniquement en DEV) dans `src/App.tsx`.
- [ ] Supprimer ou reutiliser le code mort `listCardsByDeck` et `listCardsFiltered` dans `src/db/queries.ts`.
- [ ] Factoriser les utilitaires export JSON/media (`ExportPayload`, `blobToBase64`, `downloadJson`) entre `src/routes/ImportExport.tsx` et `src/routes/Library.tsx`.
- [ ] Factoriser les utilitaires date (`parseIsoDate`, `toDateKey`, `addDays`, `normalizeToDateKey`) partages entre `src/routes/Home.tsx`, `src/leitner/engine.ts` et `src/stats/calc.ts`.
- [ ] Extraire un composant/hook commun de filtre d'arbre de tags (actuellement duplique entre `src/routes/Library.tsx` et `src/routes/Packs.tsx`).
- [ ] Remplacer `listPublicCardCountsByPackSlug` par une agregation SQL/RPC cote Supabase (eviter de paginer toutes les lignes `public_cards`) dans `src/supabase/api.ts`.
- [ ] Nettoyer les logs debug UI encore presents (`src/App.tsx`, `src/components/MarkdownRenderer.tsx`, `src/routes/ImportExport.tsx`) avec garde `import.meta.env.DEV`.
- [ ] Passer l'action "import sample" en mode DEV-only dans `src/routes/ImportExport.tsx`.
- [ ] Finir l'i18n des chaines restantes (`Tags:` dans `src/routes/PackDetail.tsx`, texte de confirmation destructif dans `src/routes/Settings.tsx`).

## P4 (maintenabilite / tests)

- [ ] Ajouter des tests routes manquantes: `src/routes/ImportExport.tsx`, `src/routes/PackDetail.tsx`, `src/routes/StatsPage.tsx`.
- [ ] Ajouter des tests auth/sync pour les erreurs reseau (AuthProvider, StreakBadge, cycle de sync).
- [ ] Decouper `src/routes/Library.tsx` et `src/routes/ReviewSession.tsx` (hooks + sous-composants) pour reduire la complexite.
- [ ] Mutualiser les helpers pipelines (`env.ts`, `supabaseAuth.ts`) entre `src/countries-pipeline/` et `src/supabase-pipeline/`.
