# Project Context — Flashcards
> Généré le 2026-03-26 via /workflows/bmad-brownfield
> **Ce fichier est la constitution du projet. Le lire en premier avant tout développement.**

## Technology Stack & Versions

| Couche | Technologie | Version |
|--------|------------|---------|
| Runtime | Node.js + Browser | — |
| Web framework | React | ^19.2.0 |
| Build | Vite | ^7.2.4 |
| Language | TypeScript (strict) | ~5.9.3 |
| Routing | React Router | ^7.12.0 |
| DB locale | Dexie (IndexedDB) | ^4.2.1 |
| Cloud sync | Supabase | ^2.91.1 |
| Tests | Vitest + Testing Library | ^4.0.18 |
| Lint | ESLint 9 + typescript-eslint | — |
| Mobile | React Native / Expo | apps/mobile/ |
| Markdown | react-markdown + KaTeX | — |
| i18n | Maison (fr/en) | src/i18n/ |

## Structure du projet

```
src/
├── auth/           # Supabase OAuth (GitHub) + email OTP
├── components/     # Composants UI réutilisables (AppShell, MarkdownRenderer…)
├── db/             # Schéma Dexie (9 versions), types Card/ReviewState/ReviewLog/Media
├── i18n/           # Internationalisation fr/en (provider + hook)
├── leitner/        # Algorithme Leitner 5 boîtes (engine, settings, config)
├── routes/         # Pages React Router (Home, ReviewSession, Library, Packs, Stats, Settings…)
├── stats/          # Calculs et composants de statistiques
├── supabase/       # Client Supabase, requêtes packs publics
├── supabase-pipeline/ # Scripts de seed (cartes publiques)
├── sync/           # Moteur de sync snapshot-based (engine, remoteStore, localStore)
├── test/           # Fixtures et mocks partagés (fake-indexeddb)
└── utils/          # Utilitaires (date, tags, training, media)

apps/
├── mobile/         # React Native / Expo
└── web/            # (alias du projet principal)

src/countries-pipeline/   # Pipeline SVG pays (Natural Earth → Supabase)
src/departements-pipeline/ # Pipeline SVG départements français
dist-countries/           # Compilé (pipeline pays)
dist-departements/        # Compilé (pipeline départements)
dist-supabase/            # Compilé (seeds Supabase)
```

## Modèle de données (Dexie)

```typescript
// Tables IndexedDB (src/db/types.ts)
Card {
  id?: number           // auto-incrémenté
  front_md: string      // Markdown recto
  back_md: string       // Markdown verso
  hint_md?: string      // Indice optionnel
  tags: string[]        // Hiérarchie: ["geo/europe/france"]
  created_at: string    // ISO 8601
  updated_at: string
  suspended?: boolean
  source?: string       // ex: 'supabase_public'
  source_type?: string
  source_id?: string
  source_ref?: string
  cloud_id?: string     // UUID pour la sync
  synced_at?: string
}

ReviewState {
  card_id: number       // PK
  box: number           // 0–5 (0 = pas encore commencé)
  due_date: string|null // Date ISO de la prochaine révision
  last_reviewed_at?: string
  is_learned?: boolean  // true = boîte 5 + bonne réponse
  learned_at?: string
  updated_at?: string
}

ReviewLog {
  id?: number
  card_id: number
  timestamp: string
  result: 'good' | 'bad'
  previous_box: number
  new_box: number
  was_learned_before?: boolean
  was_reversed?: boolean
  client_event_id?: string  // idempotence sync
  device_id?: string
}

Media {
  id?: number
  card_id: number
  side: 'front' | 'back' | 'both'
  mime: string
  blob: Blob            // stocké localement dans IndexedDB
}
```

## Algorithme Leitner (src/leitner/)

```
Boîte 0 → nouvelles cartes (pas encore initialisées)
Boîte 1 → révision quotidienne (cible : BOX1_TARGET=10 cartes actives)
Boîte 2 → tous les 3 jours
Boîte 3 → tous les 7 jours
Boîte 4 → tous les 15 jours
Boîte 5 → tous les 30 jours → is_learned=true (maintenance 90j)

autoFillBox1(today)        → promeut box0→box1 jusqu'à BOX1_TARGET
buildDailySession(today)   → box1 + cartes dues des boîtes 2–5
applyReviewResult(state, 'good'|'bad') → avance ou remet en boîte 1
```

Intervalles et `box1Target` configurables par l'utilisateur (`localStorage`).

## Sync Supabase (src/sync/)

- **Mode** : snapshot-based, last-write-wins par `updated_at`
- **Fréquence** : toutes les 15 secondes (debounced) + on window focus
- **Condition** : uniquement si l'utilisateur est connecté
- **Tables Supabase** : `cards`, `review_states`, `review_logs`, `settings`
- **Packs publics** : `packs` + `public_cards` → importés localement avec `source_type='supabase_public'`

## Routes (src/routes/)

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | Home | Dashboard, session du jour |
| `/review` | ReviewSession | Player de révision |
| `/library` | Library | Navigateur de cartes |
| `/packs` | Packs | Packs publics Supabase |
| `/card/new` | CardEditor | Création de carte |
| `/card/:id/edit` | CardEditor | Édition de carte |
| `/stats` | StatsPage | Graphiques de progression |
| `/settings` | Settings | Config + auth + sync |

## Critical Implementation Rules

### TypeScript
- Strict mode activé — pas de `any`, utiliser `unknown` + type guards
- Composants React en `.tsx`, logique pure en `.ts`
- Imports relatifs (pas d'alias `@/` configuré)

### Patterns obligatoires
- **DB** : toutes les lectures/écritures passent par Dexie (`src/db/index.ts`), jamais directement IndexedDB
- **Sync** : modifier les données locales → appeler `markLocalChange()` pour déclencher la sync
- **Dates** : toujours utiliser `normalizeToDateKey()` / `normalizeTodayKey()` de `src/utils/date.ts`
- **Markdown** : utiliser `<MarkdownRenderer>` (supporte KaTeX, images blob)
- **i18n** : toujours utiliser `useI18n()` pour les textes UI, jamais de strings hardcodées

### Tests
- Tests unitaires colocalisés avec le code (`[nom].test.ts`)
- Utiliser `fake-indexeddb` pour les tests impliquant Dexie (voir `src/test/mocks/`)
- 6 fichiers de test couvrant : engine Leitner, sync, routes, utils
- Lancer : `npx vitest run src/leitner/engine.test.ts`

### Ce qu'il NE FAUT PAS faire
- Ne pas écrire dans `.env`, `.env.local`, `package-lock.json`
- Ne pas bypasser Dexie pour accéder à IndexedDB directement
- Ne pas hardcoder des dates — toujours passer `today` en paramètre pour testabilité
- Ne pas importer depuis `dist-countries/` ou `dist-supabase/` dans le code web
- Ne pas oublier `markLocalChange()` après toute mutation locale

## Pipelines (hors web app)

```bash
npm run pipeline:countries    # Natural Earth → SVG pays → Supabase
npm run pipeline:departements # SVG départements français → Supabase
npm run seed:<pack-name>      # Seed un pack public (olympics, worldcup, currencies…)
```

Ces scripts sont dans `src/countries-pipeline/`, `src/departements-pipeline/`, `src/supabase-pipeline/`.
Ils compilent via `tsc` vers `dist-*/` et s'exécutent avec `node`.

## Variables d'environnement

| Variable | Utilisation | Requis |
|----------|-------------|--------|
| `VITE_SUPABASE_URL` | URL du projet Supabase | ✅ Web |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase | ✅ Web |

Créer `.env.local` à la racine avec ces deux valeurs.

## Commandes utiles

```bash
npm run dev          # Serveur web (http://localhost:5173)
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest watch mode
npm run check        # lint + typecheck + tests (CI complet)
npm run mobile       # Expo dev server (React Native)
```

## Déploiement

- **Web** : GitHub Actions → GitHub Pages (push sur `main`)
  - Secrets requis : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Mobile** : EAS Build → TestFlight (voir `docs/mobile-release.md`)
