# Introspection Postgres (Supabase)

## Prerequis
- Recuperer la connection string Postgres dans Supabase :
  - Project Settings -> Database -> Connection string (URI)

## Configuration locale
Ajouter la variable dans `.env.local` (ne jamais commiter ce fichier) :

```
SUPABASE_DB_URL=postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require
```

## Execution
Installer les dependances puis lancer le script :

```
npm install
SUPABASE_DB_URL="postgresql://..." npx tsx scripts/db_introspect.ts
```

Le script liste :
- les tables du schema `public`
- les colonnes (nom, type, nullable)

## Erreurs courantes
- `Missing SUPABASE_DB_URL` : variable d'environnement absente.
- `password authentication failed` : verifier les identifiants.
