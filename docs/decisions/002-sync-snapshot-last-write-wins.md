# ADR 002 — Sync snapshot-based, last-write-wins par updated_at

**Date** : 2024 (identifié via brownfield 2026-03-26)
**Statut** : Accepté

## Contexte

L'app est mono-utilisateur sur plusieurs appareils. Les conflits sont rares (éditer la même carte sur deux appareils sans sync intermédiaire). Une résolution de conflits complexe (CRDT, OT) serait disproportionnée.

## Décision

Stratégie snapshot : pull complet + merge last-write-wins par `updated_at`. Pas de delta, pas d'event sourcing.

## Conséquences

- ✅ Implémentation simple et compréhensible
- ✅ Idempotent — une resync complète ne corrompt pas les données
- ✅ ReviewLogs idempotents via `client_event_id`
- ⚠️ Snapshot full = transfert réseau proportionnel au nombre de cartes
- ⚠️ En cas de conflits simultanés, la version la plus récente gagne — perte possible si les deux appareils modifient la même carte offline
