# Changelog

## Unreleased

### Added
- Pool global (sans decks) pour les cartes, routes simplifiees.
- Library en vue tags-first avec recherche et actions Edit/Delete.
- Explorateur de tags arborescents dans Library (filtrage par prefixe).
- Import/Export tolerant + resume d'import + bouton debug.
- Supabase client lecture seule + health check en mode dev.
- Module API Supabase pour lire packs et cartes publiques.
- Pages Packs et PackDetail basees sur Supabase.
- Import d'un pack Supabase vers la base locale (idempotent).
- Dashboard Stats avec metriques globales, progression, tags, Leitner, insights.
- Page Settings pour box1_target et intervalles (localStorage).
- Tests unitaires Vitest pour la logique Leitner.
- Donnees de packs de capitales dans `packs/` (tags hierarchiques possibles).
- Header global sticky avec bouton Home.
- Accueil en grille d'icones avec descriptions + action Ajouter (carte/import/packs).
- Champs cartes optionnels `hint_md`, `source_type`, `source_id`.
- Champs ReviewState `is_learned` et `learned_at` + setting `learned_review_interval_days`.
- Maintenance learned: passage learned en Box 5 + retour périodique configurable.
- Reverse Q/R configurable via reverse_probability + log was_reversed.

### Changed
- AutoFill Box 1 par tirage aleatoire uniforme depuis Box 0.
- Ordre des cartes melange au demarrage de la session.
- UI minimale avec layout centre, styles de base et navigation header/bottom.

### Fixed
- Diagnostics IndexedDB au demarrage.
