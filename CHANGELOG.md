# Changelog

Toutes les modifications notables de ce projet sont documentées ici.
Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

---

## [0.4.1] — 2026-04-06

### ✨ Nouvelles fonctionnalités
- **Partage de decks** — création d'un lien de partage depuis la bibliothèque (`/share/:id`) ; n'importe qui peut importer les cartes en un clic, avec déduplication automatique et rapport d'import
- **Notifications Web Push** — rappel quotidien si des cartes sont dues ; opt-in depuis les réglages, garde once-per-day, hook `useNotifications` monté au démarrage
- **PWA** — manifest + service worker Workbox, cache offline complet des assets et images Supabase (`c6ff76f`)
- **Undo dernière réponse** — annuler la dernière réponse pendant une session de révision (`964c108`)
- **Raccourcis clavier globaux** — navigation au clavier dans toute l'app (`964c108`)
- **Recherche globale** — barre de recherche rapide accessible partout (`964c108`)
- **Import/Export Anki** — import de paquets `.apkg` et export vers Anki (`5ea7584`)
- **Stats avancées** — onglets supplémentaires, streaks sur la page stats (`8ce2121`, `8e46c29`)

### 🐛 Corrections
- **Delta resurrection bug (critique)** — en mode delta, les cartes synchronisées absentes du snapshot partiel n'étaient plus ré-uploadées à tort (résurrection sur suppression multi-appareils)
- **Perte de `pendingDeletes`** — la file des suppressions distantes est maintenant restaurée en cas d'échec de `deleteRemoteCards`
- **Import bloqué après erreur** — le bouton d'import reste actif après une erreur (retry possible)
- Fix badge streak — boucle de refresh infinie (`a737aaf`)

### ⚡ Améliorations
- **Sync delta** — `syncOnce` envoie un filtre `gte(updated_at, since - 30s)` pour les syncs incrémentales (moins de données transférées, protection contre le décalage d'horloge)
- Amélioration du rendu SVG des nations insulaires : anneaux par île au lieu d'une ellipse globale (`139426d`)
- Nouvelles localisations pays (`cb59172`, `b21a9e6`)

### 🧪 Tests
- Tests `SharedDeck` : chargement, not-found, erreur réseau, import, retry après erreur (5 tests)
- Tests `notifications/service` : permission, garde once-per-day, cas `Notification` manquant (11 tests)
- Tests `sync/remoteStore` delta : `gte` appelé avec `since`, absent si full snapshot (2 tests)
- Tests `sync/engine` delta & résistance : delta guard (card synced non re-uploadée), full-sync (card synced re-uploadée), restauration `pendingDeletes` (3 tests)

---

## [0.4.0] — 2026-03-30

### ✨ Nouvelles fonctionnalités
- Session de révision filtrée par boîte — lancer une session uniquement pour une boîte Leitner spécifique ([b390055](../../commit/b390055), [24851dd](../../commit/24851dd))
- Suspension de cartes en cours de session ([36235d3](../../commit/36235d3))
- Localisation des pays (cartes SVG) ([6a27130](../../commit/6a27130), [9d892bc](../../commit/9d892bc))

### 🐛 Corrections
- Fix éditeur de carte — perte de données à la sauvegarde ([909a30b](../../commit/909a30b))
- Fix `box1Target=0` ignoré silencieusement — `toPositiveInt` rejetait 0, le paramètre retombait sur la valeur par défaut ([a102bc8](../../commit/a102bc8), [349456b](../../commit/349456b))
- Fix cartes apprises incluses à tort dans la session active quand `due_date=null` ([3ded102](../../commit/3ded102))
- Fix debug de la suspension de cartes ([f57f8d5](../../commit/f57f8d5))

### 🔧 Maintenance
- Découpage de `Library.tsx` (563 lignes) en hooks + sous-composants colocalisés dans `src/routes/library/`
- Découpage de `ReviewSession.tsx` (700 lignes) de la même façon dans `src/routes/review/`
- Mutualisation de `env.ts` et `supabaseAuth.ts` entre les pipelines → `src/pipeline-shared/`
- Suppression du workspace `apps/mobile` ([50d3a43](../../commit/50d3a43))
- Ajout des fichiers de contexte BMAD (`CONTEXT.md`, `docs/project-context.md`) ([ea237b9](../../commit/ea237b9))

### 🧪 Tests
- Couverture complète du module `src/stats/` : `calcGlobalSummary`, `calcDailyReviews`, `calcBoxDistribution`, `calcTagTreeAgg` (24 tests)
- Tests de `ImportExport` : formats array/objet, champs legacy, validation schema, `markLocalChange` (10 tests)
- Tests de `PackDetail` : loading, erreur réseau, filtre recherche, import, bouton désactivé (8 tests)
- Tests de `StatsPage` : chargement, stats globales, bascule de période, arbre de tags (6 tests)
- Tests erreurs réseau : `AuthProvider` (session nulle, erreur réseau, cleanup) et `StreakBadge` (requête Supabase échouée, `reconcileDailyStatus` qui plante)

---

## [0.3.0] — 2026-03-08

### ✨ Nouvelles fonctionnalités
- Suspension de cartes depuis la bibliothèque ([3512cd4](../../commit/3512cd4), [346dfc9](../../commit/346dfc9), [a32b993](../../commit/a32b993))
- Affichage de l'indice (`hint`) pendant la révision ([fbe3dc7](../../commit/fbe3dc7))
- Session d'entraînement filtrée par tag ou sélection ([40558c9](../../commit/40558c9))
- Sécurisation du rendu Markdown (protection XSS) ([46fcf90](../../commit/46fcf90))

### 🐛 Corrections
- Fix reset de session pendant une révision ([ba320c1](../../commit/ba320c1))
- Fix problème de crop d'image ([af99822](../../commit/af99822))
- Fix bug général ([eb1db02](../../commit/eb1db02))

### ⚡ Améliorations de performance
- Remplacement de la pagination client des `public_cards` par un appel RPC Supabase pour les compteurs de packs ([dd5b9c2](../../commit/dd5b9c2))

### 🔧 Maintenance
- i18n : localisation des settings et du détail des packs ([4ec241b](../../commit/4ec241b))
- Refactoring : composant partagé `TagTreeFilter` ([e224f76](../../commit/e224f76))
- Refactoring : helpers de dates mutualisés ([3b3b8cb](../../commit/3b3b8cb))
- Refactoring : helpers d'export mutualisés ([0cda361](../../commit/0cda361))
- Suppression des helpers de requêtes DB inutilisés ([1fbd5e0](../../commit/1fbd5e0))
- Checks de démarrage limités au mode `DEV` ([36dd274](../../commit/36dd274))
- Logs de debug UI masqués hors mode `DEV` ([fdf5651](../../commit/fdf5651))
- Bouton import debug caché en production ([bc6e4cd](../../commit/bc6e4cd))
- Amélioration de l'UI de session et de la revue ([97879af](../../commit/97879af), [ebe0c62](../../commit/ebe0c62), [339e15b](../../commit/339e15b))

---

## [0.2.0] — 2026-02-21

### ✨ Nouvelles fonctionnalités
- Système de streak (série de jours consécutifs) avec badge ([b31ad42](../../commit/b31ad42), [3c26544](../../commit/3c26544))
- Affichage du nombre de cartes du lendemain sur le dashboard ([9341fca](../../commit/9341fca))
- Barre de recherche dans les packs publics ([bf89a77](../../commit/bf89a77))
- Affichage du tag courant pendant les révisions ([87fa2b4](../../commit/87fa2b4))
- Filtre par boîte dans la bibliothèque ([3bb7889](../../commit/3bb7889))
- Zoom et navigation améliorés sur les cartes SVG géographiques ([fe3fd30](../../commit/fe3fd30), [8e77bd0](../../commit/8e77bd0), [8c4f4e8](../../commit/8c4f4e8))
- Nombreux nouveaux packs publics (JO, monnaies, pays, etc.) ([3b28616](../../commit/3b28616), [bbac7e4](../../commit/bbac7e4), [ee21cb2](../../commit/ee21cb2), [1c66ad2](../../commit/1c66ad2))
- Localisation des noms de pays ([69247a0](../../commit/69247a0))
- Page de statistiques améliorée ([4b0bf4d](../../commit/4b0bf4d), [753634e](../../commit/753634e))
- Nouveau logo ([7d31da5](../../commit/7d31da5))

### 🐛 Corrections
- Fix dépassement de la limite 1000 lignes Supabase lors de la sync ([8e558ab](../../commit/8e558ab), [d11a536](../../commit/d11a536))
- Fix problème de lint ([61f27cf](../../commit/61f27cf))
- Fix bug bouton ([6bd4941](../../commit/6bd4941))

### 🔧 Maintenance
- Suppression des logos inutilisés ([0ba0c4c](../../commit/0ba0c4c))
- Amélioration de l'UI globale ([7b23699](../../commit/7b23699), [27e5618](../../commit/27e5618))

---

## [0.1.0] — 2026-02-06

### ✨ Nouvelles fonctionnalités
- Moteur de synchronisation Supabase (snapshot, last-write-wins) ([5cf2842](../../commit/5cf2842), [d76ee15](../../commit/d76ee15))
- Authentification GitHub OAuth ([b93edae](../../commit/b93edae), [9d20ca5](../../commit/9d20ca5))
- Authentification email OTP ([7eefa8c](../../commit/7eefa8c))
- Export / Import JSON de la collection ([cf7ddbb](../../commit/cf7ddbb))
- Mode entraînement : sessions depuis la bibliothèque par tag ([f38cec2](../../commit/f38cec2), [a03eb59](../../commit/a03eb59))
- Résumé de session avec réponses correctes/incorrectes ([863a91b](../../commit/863a91b))
- Gestion des médias (images blob dans IndexedDB) ([f833118](../../commit/f833118))
- Dark mode ([b19a3d2](../../commit/b19a3d2))
- Internationalisation français/anglais ([f25d5b7](../../commit/f25d5b7))
- Algorithme Leitner 5 boîtes avec boîte 5 = `is_learned` ([4e624ea](../../commit/4e624ea))
- Probabilité de révision inversée recto/verso configurable
- Licence MIT ([ff6c81b](../../commit/ff6c81b))

### 🐛 Corrections
- Fix sync : cartes non-synchronisées supprimées à tort lors d'un import ([a3a41ae](../../commit/a3a41ae))
- Fix sync : relance d'une sync en attente après sync active ([bb67dde](../../commit/bb67dde))
- Fix sync : cartes supprimées qui réapparaissent + fallback GitHub Pages ([708e030](../../commit/708e030))
- Fix sync : seed du profil utilisateur et des settings à la première connexion ([93cde11](../../commit/93cde11))
- Fix build GitHub Pages ([2d69ca8](../../commit/2d69ca8))

### 🔧 Maintenance
- Badge de boîte dans la bibliothèque ([ac834a8](../../commit/ac834a8))
- Affichage des dates de prochaine révision dans le récapitulatif ([863a91b](../../commit/863a91b))

### 📚 Documentation
- Secrets GitHub Pages pour Supabase ([c49f828](../../commit/c49f828))

---

## [0.0.1] — 2026-01-24

### ✨ Nouvelles fonctionnalités
- Application Vite + React 19 + TypeScript initialisée ([9236767](../../commit/9236767))
- Base de données locale IndexedDB via Dexie ([948ea1b](../../commit/948ea1b))
- Création, édition et suppression de cartes
- Bibliothèque de cartes avec navigation par tags ([cba97bc](../../commit/cba97bc))
- Session de révision Leitner
- Intégration Supabase (client + packs publics) ([d6bac6a](../../commit/d6bac6a), [3c9f69e](../../commit/3c9f69e))
- Page des packs publics avec import ([3c9f69e](../../commit/3c9f69e))
- Dashboard de statistiques ([9056cc2](../../commit/9056cc2))
- Page de settings (intervalles Leitner, `box1Target`) ([9056cc2](../../commit/9056cc2))
- Gestion des images dans les cartes ([8899a5c](../../commit/8899a5c))
- Ajout des capitales européennes comme premier pack ([0e963a1](../../commit/0e963a1))
- Déploiement automatique GitHub Actions → GitHub Pages

---

[Unreleased]: ../../compare/v0.5.0...HEAD
[0.5.0]: ../../compare/v0.4.0...v0.5.0
[0.4.0]: ../../compare/v0.3.0...v0.4.0
[0.3.0]: ../../compare/v0.2.0...v0.3.0
[0.2.0]: ../../compare/v0.1.0...v0.2.0
[0.1.0]: ../../compare/v0.0.1...v0.1.0
[0.0.1]: ../../commits/v0.0.1
