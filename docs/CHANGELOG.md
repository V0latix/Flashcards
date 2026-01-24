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
- Tests unitaires Vitest pour la logique Leitner.
- Donnees de packs de capitales dans `packs/` (tags hierarchiques possibles).

### Changed
- AutoFill Box 1 par tirage aleatoire uniforme depuis Box 0.
- Ordre des cartes melange au demarrage de la session.
- UI minimale avec layout centre et styles de base.

### Fixed
- Diagnostics IndexedDB au demarrage.
