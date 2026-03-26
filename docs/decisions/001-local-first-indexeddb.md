# ADR 001 — Local-first avec IndexedDB (Dexie)

**Date** : 2024 (identifié via brownfield 2026-03-26)
**Statut** : Accepté

## Contexte

Application de révision personnelle destinée à fonctionner sans connexion (transport, avion, zones sans réseau). Les données de progression doivent être disponibles immédiatement sans latence réseau.

## Décision

Toutes les lectures et écritures passent par Dexie (wrapper IndexedDB). La synchronisation Supabase est optionnelle et asynchrone.

## Conséquences

- ✅ Fonctionne 100% offline
- ✅ Pas de latence sur les opérations courantes
- ✅ Pas de coût Supabase pour les opérations de révision
- ⚠️ Sync snapshot full = O(n) en cartes — à monitorer si > 1000 cartes
- ⚠️ Pas de résolution de conflits sophistiquée (last-write-wins)
