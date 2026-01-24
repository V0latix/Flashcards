# Changelog

## Unreleased

### Added
- Pool global (sans decks) pour les cartes, routes simplifiees.
- Library en vue tags-first avec recherche et actions Edit/Delete.
- Import/Export tolerant + resume d'import + bouton debug.
- Supabase client lecture seule + health check en mode dev.
- Tests unitaires Vitest pour la logique Leitner.
- Donnees de packs de capitales dans `packs/`.

### Changed
- AutoFill Box 1 par tirage aleatoire uniforme depuis Box 0.
- Ordre des cartes melange au demarrage de la session.
- UI minimale avec layout centre et styles de base.

### Fixed
- Diagnostics IndexedDB au demarrage.
