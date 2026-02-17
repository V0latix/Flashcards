# Départements Pipeline

Pipeline Node/TypeScript pour:

1. Télécharger un GeoJSON des départements français
2. Générer un SVG zoomé par département (`out/departements/svg/{CODE}.svg`)
3. Uploader les SVG dans Supabase Storage (`france-departements-maps/svg/{CODE}.svg`)
4. Upsert la table `public.departements` (`numero`, `nom`)
5. Générer un aperçu local (`out/departements/preview.html`)

Commande globale:

`npm run pipeline:departements`
