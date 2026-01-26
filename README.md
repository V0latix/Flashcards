# Flashcards Leitner

Application de flashcards personnelle basee sur la methode de Leitner, avec support Markdown + KaTeX, stockage local via IndexedDB (Dexie) et packs publics via Supabase (lecture seule).

## Fonctionnalites
- Leitner strict (Box 0..5, intervalles 1/3/7/15/30, box1_target=10)
- Session quotidienne avec cartes Box 1 + cartes dues (Box 2..5)
- Cartes "learned" apres Box 5 + maintenance periodique (defaut 90 jours)
- Cards avec Markdown + KaTeX + tags hierarchiques (format `A/B/C`)
- Champs optionnels cartes: `hint_md`, `source_type`, `source_id`
- Library tags-first avec explorateur d'arbre
- Suppression avec confirmation (session, par tag, suppression totale)
- Import/Export JSON tolerant + diagnostic d'import
- Packs publics (Supabase) + import idempotent vers la base locale
- Dashboard Stats (global, progression, tags, Leitner, insights)
- Settings pour box1_target + intervalles
- Accueil en grille d'icones + navigation header/bottom
- Parametre de maintien learned_review_interval_days (defaut 90)
- Parametre reverse_probability (0..1) pour inverser question/reponse

## Tech
- React + TypeScript + Vite
- IndexedDB via Dexie
- Supabase (lecture seule)
- Vitest pour les tests unitaires

## Installation
```bash
npm install
npm run dev
```

## Configuration Supabase (lecture seule)
Creer un fichier `.env.local` a la racine du projet :

```
VITE_SUPABASE_URL=https://<ton-projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<ta-cle-anon>
```

Les valeurs se trouvent dans Supabase :
Project Settings -> API -> Project URL + anon/public key.

Le client frontend est dans `src/utils/supabase.ts` (anon key uniquement).

## Scripts utiles
- `npm run dev` : demarrer l'app
- `npm run build` : build production
- `npm run lint` : lint
- `npm test` : tests unitaires
- `npm run mobile` : demarrer l'app mobile Expo

## Deployment
### Web (GitHub Pages)
- Build + deploy via GitHub Actions: `.github/workflows/deploy-web.yml`
- URL: https://v0latix.github.io/Flashcards/
- Configure repo secrets for deploy:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Mobile (TestFlight)
Voir `docs/mobile-release.md`.

## Mobile (Expo)
Voir `docs/mobile-dev.md` pour les prerequis et la config.

Smoke check rapide :
1) `npm run mobile`
2) Accueil -> "Play Session" ouvre une session
3) Settings -> Open Media Test (image + drapeau SVG + LaTeX)
4) Packs -> ouvrir un pack -> Download pack -> Library affiche les cartes

## Pages principales
- `/` Home
- `/review` ReviewSession
- `/library` Library (tags arborescents)
- `/card/new` CardEditor
- `/card/:cardId/edit` CardEditor
- `/packs` Packs (Supabase)
- `/packs/:slug` PackDetail
- `/import-export` Import/Export
- `/stats` Stats (dashboard)
- `/settings` Settings

## Import/Export JSON
Formats acceptes :
- `{ "schema_version": 1, "cards": [ ... ] }`
- `{ "cards": [ ... ] }`
- `[ ... ]`

Champs cartes acceptes : `front_md`/`back_md` ou `front`/`back`.
Chaque carte importee obtient un ReviewState (`box=0`, `due_date=null`) si absent.

## Packs publics (Supabase)
- Liste des packs sur `/packs`
- Detail d'un pack sur `/packs/:slug`
- Import d'un pack vers la base locale (idempotent via `source` + `source_id`)

## Donnees locales
- Cards stockees en IndexedDB (Dexie)
- ReviewState et ReviewLog generes localement
- Metadonnees optionnelles: `hint_md`, `source_type`, `source_id`
- ReviewState: `is_learned`, `learned_at`

## Verification rapide
1) `npm run dev`
2) Importer un pack public, puis ouvrir `/library`
3) Lancer une session `/review`
4) Ouvrir `/stats` pour le dashboard
5) Ouvrir `/settings` et ajuster box1_target/intervalles

## Structure rapide
- `src/leitner/` : moteur Leitner
- `src/db/` : Dexie + queries
- `src/routes/` : pages
- `src/supabase/` : client + API + import
- `packs/` : packs JSON locaux

## Notes
- Supabase est utilise en lecture seule (pas d'auth).
- Le health check Supabase s'exécute uniquement en mode dev.
