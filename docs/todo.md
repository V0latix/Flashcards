# TODO — Flashcards

> Dernière mise à jour : 2026-03-26

---

## Corrections en cours

### Qualité du code

- [x] Découper `src/routes/Library.tsx` en hooks + sous-composants → `src/routes/library/` (563 → ~190 lignes)
- [x] Découper `src/routes/ReviewSession.tsx` de la même façon → `src/routes/review/` (700 → ~175 lignes)
- [x] Mutualiser les helpers pipelines (`env.ts`, `supabaseAuth.ts`) → `src/pipeline-shared/`

### Couverture de tests

- [x] Tests manquants : `src/routes/ImportExport.tsx`
- [x] Tests manquants : `src/routes/PackDetail.tsx`
- [x] Tests manquants : `src/routes/StatsPage.tsx`
- [x] Tests manquants : tout le module `src/stats/` (aucun test actuellement)
- [x] Tests erreurs réseau : `AuthProvider`, `StreakBadge`, cycle de sync dégradé

### Performance

- [ ] `listPublicCardCountsByPackSlug` pagine toutes les lignes `public_cards` — remplacer par une agrégation SQL/RPC côté Supabase (`src/supabase/api.ts`)

---

## Features à ajouter

### Haute valeur (produit)

- [ ] **Génération de cartes par IA** — coller un texte, l'IA propose des paires recto/verso (API Claude ou OpenAI, configurable)
- [ ] **Export Anki** — exporter la collection au format `.apkg` pour interopérabilité
- [ ] **PWA** — manifest + service worker pour installation sur l'écran d'accueil et cache offline complet
- [ ] **Statistiques avancées** — courbe de rétention, heatmap d'activité (style GitHub), distribution boîtes dans le temps

### UX

- [ ] **Raccourcis clavier globaux** — navigation entre pages sans souris (actuellement uniquement en session de révision)
- [ ] **Mode sombre** — thème dark complet (les variables CSS sont déjà en place)
- [ ] **Barre de progression de session** — visualiser le ratio cartes vues / total en cours de révision
- [ ] **Annuler la dernière réponse** — bouton "Undo" dans la session de révision
- [ ] **Recherche globale** — chercher une carte par son contenu depuis n'importe quelle page

### Partage & Social

- [ ] **Partage de decks** — générer un lien de partage d'une collection de cartes (lecture seule)
- [ ] **Mode challenge** — session chronométrée avec score, pour un usage compétitif ou de révision intensive

### Technique

- [ ] **Sync delta** — n'envoyer que les cartes modifiées depuis la dernière sync (actuellement snapshot full O(n))
- [ ] **Notifications de rappel** (PWA) — rappel quotidien si des cartes sont dues et que l'app n'a pas été ouverte
- [ ] **Cache des images distantes** — mettre en cache localement les images des packs Supabase pour éviter les re-téléchargements
- [ ] **Import CSV/TSV** — format simple pour importer des cartes depuis Excel ou Google Sheets

---

## Idées en réserve (basse priorité)

- Support audio (prononciation, apprentissage des langues)
- Mode "saisie libre" — taper la réponse au clavier au lieu de cliquer Bon/Mauvais
- Historique des révisions consultable (qui a été revu, quand, résultat)
- Reproduction déterministe d'une session (RNG seeded) pour le debug
