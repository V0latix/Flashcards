# Flashcards Leitner — BMAD Specification
## B — Brainstorm

### Vision
Créer une application de flashcards personnelle, pérenne et fiable, basée sur la méthode de Leitner, permettant la révision quotidienne de contenus hétérogènes (maths, actuariat, informatique, langues, culture générale), avec support avancé des formules mathématiques et des images.

L’outil est pensé d’abord pour un usage personnel, mais reste partageable et potentiellement public.

---

### Objectifs
- Mettre en place rapidement un outil utilisable au quotidien
- Compléter Anki sans chercher à le remplacer
- Centraliser des flashcards complexes (formules, définitions, images)
- Garantir une expérience fluide sur le long terme (5–10 ans)

---

### Utilisation cible
- Usage quotidien
- Sessions courtes (5–10 minutes)
- Aucune friction à l’ouverture
- Toutes les cartes doivent être consultables et éditables

---

### Types de contenus
- Mathématiques (définitions, formules, raisonnements)
- Actuariat / finance
- Informatique
- Culture générale (ex : drapeaux)
- Langues

Les cartes peuvent être :
- simples (question → réponse)
- formelles (définition mathématique)
- composites (texte + image + formule)

---

### Importance des médias
Priorité :
1. Formules LaTeX — indispensable
1. Images / schémas — indispensable
3. Tableaux — secondaire

---

### Philosophie de révision
- Méthode de Leitner stricte
- Deux réponses possibles :
  - **Bon** → promotion
  - **Faux** → retour en Box 1
- Règles simples, déterministes et explicites
- Aucun machine learning

---

## M — Model

### 1) Boîtes Leitner

- **Box 0** : nouvelles cartes (non introduites)
- **Box 1 à 5** : cartes en révision espacée
- Nombre de boîtes : `N = 5`

---

### 2) Intervalles (en jours)

| Box | Intervalle |
|----:|-----------:|
| 1 | 1 jour |
| 2 | 3 jours |
| 3 | 7 jours |
| 4 | 15 jours |
| 5 | 30 jours |

---

### 3) Règles de transition

#### Réponse "Bon"
- `new_box = min(box + 1, 5)`
- `due_date = today + interval[new_box]`

#### Réponse "Faux"
- `new_box = 1`
- `due_date = today + 1`

---

### 4) Règle centrale — Remplissage quotidien de la Box 1

Objectif :
> **Garantir que la Box 1 contient exactement 10 cartes chaque jour.**

Paramètre :
- `box1_target = 10`

Règle quotidienne (au calcul de la session du jour) :

1. Calculer  
   `current_box1 = nombre total de cartes avec box = 1`

2. Si `current_box1 < box1_target` et s’il reste des cartes en Box 0 :
   - `to_introduce = min(box1_target - current_box1, count(Box 0))`
   - sélectionner `to_introduce` cartes de Box 0 (tirage aleatoire uniforme, sans remise)
   - pour chacune :
     - `box = 1`
     - `due_date = today`

Résultat :
- Tous les jours, la Box 1 contient 10 cartes (si la Box 0 n’est pas vide).

---

### 5) Introduction manuelle (boost)

Action utilisateur :
- “Introduire X nouvelles cartes” (ex : X = 10)

Effet :
- X cartes passent de Box 0 à Box 1
- `due_date = today`
- La Box 1 peut dépasser temporairement 10 cartes

---

### 6) Construction de la session du jour

La session quotidienne contient :
1. Les **10 cartes de la Box 1**
2. **Toutes les cartes dues aujourd’hui** des Box 2 à 5

La liste finale est melangee une seule fois au demarrage de la session.

La session n’impose aucune limite stricte sur le nombre total de cartes.

---

### 7) Modèle de données (pool global, tags-first)

#### Card
- `id`
- `front_md`
- `back_md`
- `tags[]`
- `created_at`
- `updated_at`
- `suspended` (bool, optionnel)

#### Media
- `id`
- `card_id`
- `side` (front | back | both)
- `mime`
- `blob`

#### ReviewState
- `card_id`
- `box` ∈ {0..5}
- `due_date`
- `last_reviewed_at` (nullable)

#### ReviewLog
- `id`
- `card_id`
- `timestamp`
- `result` (good | bad)
- `previous_box`
- `new_box`

---

### 8) Invariants

- Toutes les cartes appartiennent au pool global
- Chaque carte a un ReviewState unique
- `box = 0` ⇒ carte non introduite
- Toute réponse génère une entrée ReviewLog
- Les règles Leitner sont explicites et déterministes

## R — Routes (sans deck)

- `/` Home
- `/review` ReviewSession
- `/library` Library
- `/card/new` CardEditor
- `/card/:cardId/edit` CardEditor
- `/stats` Stats
- `/settings` Settings
- `/import-export` ImportExport

## L — Logique (pool global)

- La session du jour s'applique au pool global, sans `deck_id`
- Le remplissage de la Box 1, la sélection des cartes dues et les transitions Bon/Faux s'appliquent a toutes les cartes

---

## U — UI (minimal)

- Layout centre avec largeur max + padding
- Styles reutilisables (container, card, button, input) dans `src/index.css`
- Library en vue tags-first + recherche dans le scope courant

## I — Import/Export

- Export JSON du pool global (schema_version=1)
- Import tolerant aux formats :
  - `{ "schema_version": 1, "cards": [ ... ] }`
  - `{ "cards": [ ... ] }`
  - `[ ... ]` (tableau racine)
- Champs acceptes : `front_md`/`back_md` ou `front`/`back`
- Chaque carte importee obtient un ReviewState (`box=0`, `due_date=null`) si absent
- Bouton debug pour importer un echantillon et logs de diagnostic

## S — Services externes

- Supabase en lecture seule (client dans `src/supabase/`)
- Health check au demarrage en mode dev uniquement
- Variables attendues : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## V — Verification

Commandes :
- `npm run dev`
- `npm test`

Checks manuels :
- Import debug depuis `/import-export` (resume + logs console)
- Session `/review` : ordre des cartes melange au demarrage
- Library `/library` : tags-first + recherche dans le scope courant

## A — Act (à venir)

- Architecture technique
- Structure du repo
- Écrans
- Découpage en tâches GPT Codex (VS Code)

---

## D — Deliver (critères de réussite v1)

- Créer et éditer des cartes
- Voir toutes les cartes par box
- Avoir 10 cartes en Box 1 chaque jour
- Réviser les cartes dues des autres box
- Voir les statistiques
- Exporter / importer les données
