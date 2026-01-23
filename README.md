# Flashcards Leitner

Application personnelle de flashcards basee sur la methode de Leitner, pensee pour des revisions quotidiennes rapides avec support des formules LaTeX et des images.

## Vision
- Centraliser des flashcards complexes (formules, definitions, images)
- Utilisation quotidienne sans friction (sessions courtes de 5 a 10 minutes)
- Experience fiable sur le long terme (5 a 10 ans)

## Contenus vises
- Mathematiques (definitions, formules, raisonnements)
- Actuariat / finance
- Informatique
- Culture generale
- Langues

Types de cartes :
- simples (question -> reponse)
- formelles (definition mathematique)
- composites (texte + image + formule)

## Methode Leitner (regles)
- 2 reponses possibles : `Bon` (promotion) ou `Faux` (retour en Box 1)
- Methode deterministe, aucune logique de machine learning

### Boites et intervalles
| Box | Intervalle (jours) |
|----:|--------------------:|
| 1 | 1 |
| 2 | 3 |
| 3 | 7 |
| 4 | 15 |
| 5 | 30 |

### Transitions
- **Bon** : `new_box = min(box + 1, 5)` ; `due_date = today + interval[new_box]`
- **Faux** : `new_box = 1` ; `due_date = today + 1`

### Remplissage quotidien de la Box 1
Objectif : **garantir 10 cartes en Box 1 chaque jour**.

Si la Box 1 contient moins de 10 cartes et qu'il reste des cartes en Box 0 :
- introduire `min(10 - current_box1, count(Box 0))` cartes
- `box = 1`
- `due_date = today`

### Session du jour
- Les 10 cartes de la Box 1
- Toutes les cartes dues aujourd'hui des Box 2 a 5

## Modele de donnees (cible)
- **Deck** : id, name, created_at, updated_at, settings
- **Card** : id, deck_id, front_md, back_md, tags[], created_at, updated_at, suspended?
- **Media** : id, card_id, side, mime, blob
- **ReviewState** : card_id, box (0..5), due_date, last_reviewed_at
- **ReviewLog** : id, card_id, timestamp, result (good|bad), previous_box, new_box

## Criteres de reussite v1
- Creer et editer des cartes
- Voir les cartes par box
- Avoir 10 cartes en Box 1 chaque jour
- Reviser les cartes dues des autres box
- Voir les statistiques
- Exporter / importer les donnees

## Statut
Spec initiale dans `BMAD.md`.
