# Stats metrics (contract)

## Global summary
- totalCards: nombre total de cartes.
- dueToday: cartes dues aujourd'hui (boxes 2..5 + learned en maintenance).
- learnedCount: cartes marquees learned.
- reviewsToday: reponses enregistrees aujourd'hui.
- successRate7d: ratio bon / total sur les 7 derniers jours.

## Daily reviews
- DailyReviewAgg: total des reponses par jour, avec split bon / faux.
- Periodes: 7, 30 ou 90 jours (fenetre glissante).

## Box distribution
- compte les cartes par box (0..5).

## Tag aggregation (hierarchique)
- tagPath: prefixe (ex: Geographie/Capitales).
- cardsCount: nombre de cartes dans le prefixe.
- dueCount: cartes dues dans le prefixe.
- successRate: bon / total des reviews pour ce prefixe.
- avgBox: moyenne des boxes pour les cartes du prefixe.
- learnedCount: cartes learned dans le prefixe.
