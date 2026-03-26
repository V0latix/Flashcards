# PRD — Flashcards
> Généré le 2026-03-26 via /workflows/bmad-brownfield

## Résumé produit

Application de révision par flashcards utilisant la méthode de Leitner à 5 boîtes.
**Local-first** : fonctionne entièrement offline, sync optionnelle via Supabase.
Disponible en web (GitHub Pages).

## Utilisateurs cibles

- **Étudiant solo** qui veut mémoriser du contenu (langues, géographie, sciences, histoire…)
- **Autodidacte** qui crée ses propres cartes ou importe des packs publics
- Usage **personnel** : un compte = un utilisateur sur plusieurs appareils

## Features livrées

### Core
- [x] Algorithme Leitner 5 boîtes avec intervalles configurables
- [x] Création et édition de cartes (Markdown + KaTeX + images)
- [x] Session de révision quotidienne (recto/verso, bonne/mauvaise)
- [x] Mode recto inversé (probabilité configurable)
- [x] Cartes suspendues (exclues des sessions)
- [x] Tags hiérarchiques + filtre TreeView dans la bibliothèque
- [x] Import/Export de cartes
- [x] Statistiques de progression

### Sync & Auth
- [x] Authentification Supabase (GitHub OAuth + Email OTP)
- [x] Sync multi-appareils (snapshot, last-write-wins, 15s debounced)
- [x] Fonctionne 100% offline sans compte

### Packs publics
- [x] Localisation des pays du monde (SVG générés via pipeline Natural Earth)
- [x] Localisation des départements français
- [x] Packs culturels : Jeux Olympiques, Coupe du Monde, F1, Champions League, Tour de France, Top 14, Euro, Présidents français, Histoire de France, Auteurs & Œuvres, Monnaies, Éléments atomiques, Unités SI
- [x] Import d'un pack public dans la collection personnelle

### Internationalisation
- [x] Interface disponible en français et anglais

## Epics identifiés

### Epic 1 — Core Leitner
Algorithme de révision, session quotidienne, gestion des boîtes.
→ `docs/epic-01-core-leitner.md`

### Epic 2 — Cartes & Éditeur
Création, édition, suppression, import/export, Markdown, médias.
→ `docs/epic-02-cards-editor.md`

### Epic 3 — Sync & Auth
Authentification, synchronisation multi-appareils, gestion des conflits.
→ `docs/epic-03-sync-auth.md`

### Epic 4 — Packs publics
Pipeline de génération SVG, seed Supabase, import dans la collection.
→ `docs/epic-04-public-packs.md`

## Axes d'évolution potentiels

- Partage de decks entre utilisateurs
- Statistiques avancées (courbe de rétention, heatmap)
- Mode "challenge" (timer, score)
- Génération de cartes assistée par IA
- Support audio (prononciation, langues)
- Notifications de rappel (PWA)
