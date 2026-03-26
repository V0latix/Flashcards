# Module : leitner

## Responsabilité

Cerveau algorithmique de l'application. Contient toute la logique de répétition espacée, indépendante du framework, de la UI et du stockage.

## Structure interne

```
src/leitner/
├── config.ts      → Constantes immuables (BOX1_TARGET=10, INTERVAL_DAYS, LEITNER_BOX_COUNT=5)
├── settings.ts    → Lecture/écriture des paramètres utilisateur dans localStorage
├── engine.ts      → Algorithme Leitner : autoFillBox1, buildDailySession, applyReviewResult
├── engine.test.ts → Tests unitaires (happy path + nominal)
└── engine.edge-cases.test.ts → Tests edge cases + régressions (générés)
```

## Patterns utilisés

- **Déterminisme** : toutes les fonctions reçoivent `today: string` en paramètre — jamais `new Date()` en interne → testabilité totale
- **Surcharge de signature** : `autoFillBox1(today)` et `autoFillBox1(deckId, today)` pour compatibilité avec l'ancien modèle avec decks

## Dépendances clés

- Dépend de : `src/db` (Dexie), `src/sync/queue` (markLocalChange), `src/utils/date`
- Utilisé par : `src/routes/` (ReviewSession, Home), `src/stats/`

## Conventions spécifiques

- Intervalles : `INTERVAL_DAYS = { 1:1, 2:3, 3:7, 4:15, 5:30 }` jours
- Carte box 0 → box 2 (pas box 1) sur bonne réponse (première réponse = saute une boîte)
- `box1Target` minimum = 1 (0 est rejeté par `toPositiveInt` et repasse au défaut = 10)
- Cartes learned : maintenance à 90j calculée depuis `learned_at`, indépendamment de `due_date`

## Points d'attention

- `buildDailySession` appelle `autoFillBox1` en interne — ne pas l'appeler deux fois
- Les cartes `is_learned=true` avec `due_date=null` sont incluses dans la session si `learned_at + 90j <= today`
- `applyReviewResult` sur un `card_id` inexistant ne throw pas — échec silencieux
