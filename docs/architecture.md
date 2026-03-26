# Architecture — Flashcards
> Généré le 2026-03-26 via /workflows/bmad-brownfield

## Vue d'ensemble

```mermaid
graph TD
    subgraph "Client (Browser / React Native)"
        UI[React UI]
        Router[React Router 7]
        Leitner[Leitner Engine]
        Dexie[Dexie / IndexedDB]
        SyncEngine[Sync Engine]
    end

    subgraph "Supabase (Cloud)"
        Auth[Auth — GitHub OAuth / Email OTP]
        DB[(PostgreSQL)]
        Storage[Public Packs]
    end

    UI --> Router
    Router --> Leitner
    Leitner --> Dexie
    UI --> Dexie
    Dexie --> SyncEngine
    SyncEngine -->|every 15s + focus| Auth
    Auth --> DB
    SyncEngine --> DB
    Storage --> UI
```

## Flux de données principal

```
1. Utilisateur révise une carte
   └→ ReviewSession appelle applyReviewResult()
       └→ Leitner Engine calcule nouveau box + due_date
           └→ Dexie écrit ReviewState + ReviewLog
               └→ markLocalChange() déclenche sync debounced
                   └→ SyncEngine upsert Supabase (si connecté)

2. Nouvel appareil / reconnexion
   └→ SyncEngine fetch snapshot complet depuis Supabase
       └→ Merge last-write-wins par updated_at
           └→ Dexie mis à jour localement
```

## Modèle de données

```mermaid
erDiagram
    Card {
        int id PK
        string front_md
        string back_md
        string hint_md
        string[] tags
        string created_at
        string updated_at
        bool suspended
        string source
        string source_type
        string source_id
        string cloud_id
        string synced_at
    }
    ReviewState {
        int card_id PK
        int box
        string due_date
        string last_reviewed_at
        bool is_learned
        string learned_at
        string updated_at
    }
    ReviewLog {
        int id PK
        int card_id
        string timestamp
        string result
        int previous_box
        int new_box
        string client_event_id
        string device_id
    }
    Media {
        int id PK
        int card_id
        string side
        string mime
        blob blob
    }

    Card ||--o| ReviewState : "a un état"
    Card ||--o{ ReviewLog : "génère des logs"
    Card ||--o{ Media : "a des médias"
```

## Algorithme Leitner — Flux décisionnel

```mermaid
flowchart TD
    Start([Session du jour]) --> AutoFill
    AutoFill[autoFillBox1: box0→box1 jusqu'à target=10] --> Build
    Build[buildDailySession: box1 + dues box2-5] --> Show
    Show[Afficher carte] --> Answer{Réponse}
    Answer -->|Bonne| Good[box+1, due_date += interval]
    Answer -->|Mauvaise| Bad[box=1, due_date = today]
    Good -->|box5 + good| Learned[is_learned=true, interval=90j]
    Good --> Next
    Bad --> Next
    Learned --> Next
    Next{Carte suivante ?} -->|oui| Show
    Next -->|non| End([Session terminée])
```

## Sync Engine — Stratégie

```
Stratégie : Snapshot-based, Last-Write-Wins par updated_at

Pull  → fetchRemoteSnapshot() → merge avec local si remote.updated_at > local.updated_at
Push  → upsertRemoteCards() / upsertRemoteProgress() / upsertRemoteSettings()
Logs  → insertRemoteReviewLogs() (append-only, idempotent via client_event_id)
Deletes → pendingDeletes[] → deleteRemoteCards() au prochain cycle

Déclencheurs :
  - Timer 15s (debounced)
  - window focus
  - markLocalChange() après toute mutation Dexie
```

## Packs publics — Architecture

```
Supabase (tables: packs, public_cards)
    └→ Packs.tsx fetchPublicPacks()
        └→ PackDetail.tsx "Importer"
            └→ Dexie: cards avec source_type='supabase_public'
                └→ Leitner Engine traite ces cartes comme les autres
```

## Pipelines de génération de contenu

```
Natural Earth (shapefile)
    └→ downloadNaturalEarth.ts
        └→ loadCountries.ts (GeoJSON)
            └→ renderCountrySvg.ts (d3-geo, NaturalEarth1 projection)
                └→ generateAllSvgs.ts → out/svg-{transparent,blue}/
                    └→ uploadToSupabase.ts → Supabase Storage
                        └→ seedCountries.ts → table countries
```

## Structure des composants clés

```
AppShell
├── Header (nav)
└── <Outlet> (React Router)
    ├── Home
    │   └── LeitnerInfo, StreakBadge
    ├── ReviewSession
    │   └── MarkdownRenderer (KaTeX + images blob)
    ├── Library
    │   └── TagTreeFilter
    ├── CardEditor
    │   └── MarkdownRenderer (preview)
    ├── Packs → PackDetail
    ├── StatsPage
    └── Settings
        └── AuthButton (Supabase OAuth)
```

## Décisions techniques (ADRs identifiés)

| # | Décision | Raison |
|---|----------|--------|
| 1 | IndexedDB via Dexie (local-first) | Fonctionnement offline, performance, pas de dépendance réseau |
| 2 | Sync snapshot-based (pas event sourcing) | Simplicité, pas besoin d'historique des conflits |
| 3 | Last-write-wins par `updated_at` | Cas d'usage personnel (1 utilisateur, multi-appareils) |
| 4 | KaTeX via remark/rehype | Support LaTeX dans les cartes (maths, sciences) |
| 5 | Pipelines séparés (dist-countries/) | Scripts Node.js isolés du bundle web |
| 6 | React Native/Expo dans apps/mobile/ | Partage possible de la logique Leitner |
| 7 | Tags hiérarchiques (geo/europe/france) | Filtrage TreeView, compatibilité avec les packs publics |
