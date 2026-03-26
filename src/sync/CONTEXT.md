# Module : sync

## Responsabilité

Synchronisation bidirectionnelle entre IndexedDB local et Supabase. Optionnelle — l'app fonctionne 100% offline sans ce module.

## Structure interne

```
src/sync/
├── engine.ts      → Orchestrateur principal (runInitialSync, syncOnce, requestSync, enqueueRemoteDelete)
├── localStore.ts  → Lecture du snapshot local (loadLocalSnapshot)
├── remoteStore.ts → Appels Supabase (fetch/upsert/delete/insert)
├── ids.ts         → Génération UUID cloud_id + device_id
├── queue.ts       → markLocalChange(), queueCardDelete() — point d'entrée pour les mutations
├── types.ts       → RemoteCard, RemoteProgress, RemoteReviewLog, RemoteSnapshot, LocalSnapshot
├── useSync.ts     → Hook React (démarre/arrête la sync selon l'auth)
├── engine.test.ts → Tests nominaux
└── engine.resilience.test.ts → Tests réseau dégradé + edge cases
```

## Stratégie de sync

```
Stratégie : Snapshot-based, Last-Write-Wins par updated_at
Pull  → fetchRemoteSnapshot() → merge avec local si remote.updated_at > local.updated_at
Push  → upsertRemoteCards() / upsertRemoteProgress() / upsertRemoteSettings()
Logs  → insertRemoteReviewLogs() (append-only, idempotent via client_event_id)
Delete → pendingDeletes[] → deleteRemoteCards() au prochain cycle
```

## Dépendances clés

- Dépend de : `src/db`, `src/leitner/settings` (sync des settings Leitner)
- Utilisé par : `src/auth/AuthProvider`, `src/routes/Settings`, composants qui mutent les cartes

## Conventions spécifiques

- **Toujours appeler `markLocalChange()`** après toute mutation Dexie — déclenche la sync debounced
- **Toujours appeler `queueCardDelete(card.cloud_id)`** avant de supprimer une carte localement
- `isSyncing` flag global — protège contre les appels concurrents (second appel → `pendingSync=true`)
- Erreurs réseau : catch silencieux avec `console.error` — jamais de throw vers le caller
- `cloud_id` est assigné au premier sync si absent — ne jamais supposer qu'il existe

## Points d'attention

- Le snapshot full est O(n) en cartes — peut ralentir avec > 1000 cartes
- `pendingDeletes` est un tableau de `cloud_id` strings, pas d'IDs locaux
- La sync ne se lance PAS si `activeUserId` est null (setActiveUser au login/logout)
- `runInitialSync` vs `syncOnce` : initial gère les cas local-vide/remote-vide, syncOnce fait le merge incrémental
