# TODO - Ameliorations app Flashcards

## P0 (priorite haute)

- [x] Reinitialiser completement l'etat de session quand `tag` ou `mode` change dans `src/routes/ReviewSession.tsx` (reset `index`, `goodCount`, `badCount`, `showBack`, `isDeleteOpen`).
- [x] Corriger la securite Markdown dans `src/components/MarkdownRenderer.tsx` en retirant ou encadrant `urlTransform={(uri) => uri}`.

## P1 (priorite produit)

- [x] Faire en sorte que le mode training respecte les filtres actifs (utiliser `filteredCards` ou `selectedCardIds`) dans `src/routes/Library.tsx`.
- [x] Ajouter l'affichage de `hint_md` en session de review (bouton "Indice" + raccourci clavier) dans `src/routes/ReviewSession.tsx`.
- [ ] Implementer la suspension de cartes (`suspended`) avec actions UI et exclusion dans le moteur de session (`src/db/types.ts`, `src/leitner/engine.ts`, `src/routes/Library.tsx`).
- [ ] Finaliser la logique "box1 target" (brancher `autoFillBox1` ou simplifier les restes de code) dans `src/leitner/engine.ts`.

## P2 (qualite UX/accessibilite)

- [ ] Ameliorer le menu "Add" (Escape, click outside, focus management) et l'etat actif des routes dynamiques dans `src/components/AppShell.tsx`.
- [ ] Rendre la modale auth plus robuste (Escape, click backdrop, focus trap) dans `src/auth/AuthButton.tsx`.
- [ ] Internationaliser les chaines en dur restantes (`Tags`, `Image introuvable`, legende chart, etc.) dans `src/routes/Library.tsx`, `src/components/MarkdownRenderer.tsx`, `src/routes/StatsPage.tsx`.
- [ ] Enrichir la page packs (description, tags, nombre de cartes, import direct) dans `src/routes/Packs.tsx`.
