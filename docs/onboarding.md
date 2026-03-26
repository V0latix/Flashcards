# Guide d'onboarding — Flashcards

> Pour un nouveau développeur ou une nouvelle session Claude Code.

---

## En 5 minutes

**Ce que fait le projet** : App de révision par flashcards (méthode Leitner 5 boîtes), local-first, web, avec sync Supabase optionnelle et catalogue de packs publics.

**Lancer localement** :
```bash
cp .env.local.example .env.local  # ou créer avec VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev        # → http://localhost:5173
```

**Première chose à lire** : `src/leitner/engine.ts` — c'est le cœur de l'app.

---

## Architecture en bref

1. **Local-first** : IndexedDB (Dexie) est la source de vérité — pas Supabase
2. **Leitner 5 boîtes** : box 0 = nouveauté, box 5 = maîtrisé, intervalles 1/3/7/15/30j
3. **Sync optionnelle** : snapshot complet toutes les 15s si connecté, last-write-wins
4. **Markdown + KaTeX** : tout le contenu est du Markdown, les formules sont en LaTeX
5. **Tags hiérarchiques** : `geo/europe/france` → filtrage TreeView dans la bibliothèque
6. **Packs publics** : générés via pipelines Node.js séparés (pays, départements, sport, science…)

---

## Où trouver quoi

| Je veux... | Je regarde... |
|---|---|
| Algorithme de révision | `src/leitner/engine.ts` |
| Schéma de données | `src/db/index.ts` + `src/db/types.ts` |
| Synchronisation Supabase | `src/sync/engine.ts` |
| Pages / routes | `src/routes/` |
| Composants UI | `src/components/` |
| Internationalisation | `src/i18n/translations.ts` |
| Tests | `*.test.ts` colocalisés avec le code |
| Pipeline SVG pays | `src/countries-pipeline/` |
| Packs publics (seeds) | `src/supabase-pipeline/` |
| Config Leitner | `src/leitner/settings.ts` + `config.ts` |
| Auth | `src/auth/AuthProvider.tsx` |
| Architecture complète | `docs/architecture.md` |
| Décisions techniques | `docs/decisions/` |

---

## Conventions importantes

1. **Toujours passer `today: string`** aux fonctions Leitner — jamais `new Date()` en interne
2. **Toujours appeler `markLocalChange()`** après toute mutation Dexie
3. **Toujours appeler `queueCardDelete(card.cloud_id)`** avant de supprimer une carte
4. **Utiliser `useI18n()`** pour tous les textes UI — jamais de strings hardcodées
5. **Ne jamais importer** depuis `dist-countries/` ou `dist-supabase/` dans le code web

---

## Pièges à éviter

- **Ne pas comparer des ISO strings pour les dates** → utiliser `normalizeToDateKey()` de `src/utils/date.ts`
- **`buildDailySession` appelle `autoFillBox1` en interne** → ne pas appeler les deux
- **`box1Target=0` est ignoré** → la validation `toPositiveInt` rejette 0, retombe sur le défaut (10)
- **Les médias sont des Blobs** dans IndexedDB — ne pas les sérialiser en base64 pour le stockage
- **Ne pas bypasser Dexie** pour accéder directement à IndexedDB
- **`isSyncing` est un flag global** → syncOnce concurrent ne lance pas 2 syncs en parallèle

---

## Commandes utiles

```bash
npm run dev              # Serveur web dev
npm run test             # Tests Vitest (run once)
npm run test:watch       # Tests en watch mode
npm run check            # lint + typecheck + tests (CI complet)
npm run pipeline:countries   # Regénérer SVG pays + upload Supabase
npm run seed:<pack>      # Seeder un pack public (ex: seed:countries-pack)
npx vitest run src/leitner/engine.test.ts  # Un seul fichier de test
```

---

## Pour aller plus loin

- Architecture détaillée → `docs/architecture.md`
- Constitution du projet → `docs/project-context.md`
- PRD + épics → `docs/prd.md`
- Décisions techniques → `docs/decisions/`
- Agents disponibles → voir section "Routing des agents" dans `CLAUDE.md`
