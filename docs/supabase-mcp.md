# Supabase MCP (Guide Pratique)

Ce repo utilise Supabase (Postgres + Storage). Pour les futures demandes, on peut interagir avec ton projet Supabase de 2 manieres:

- **Via MCP Supabase dans VSCode** (recommande pour inspecter / executer des actions ponctuelles directement depuis l'IDE).
- **Via scripts Node du repo** (recommande pour pipelines reproductibles, seeds, uploads en batch).

Le projet mentionne un endpoint MCP Supabase du type:

`https://mcp.supabase.com/mcp?project_ref=<PROJECT_REF>`

Exemple (ton projet): `reujhlbpmxyuqiscsldl`

## 1) A quoi sert MCP ici

MCP (Model Context Protocol) sert a donner a l'assistant un acces outille a ton projet Supabase depuis VSCode:

- Introspection DB (tables, colonnes, contraintes)
- Execution SQL (SELECT, DDL, seed, cleanup)
- Storage (lister buckets/objets, upload/suppression)
- Verification rapide (comptages, sanity checks)

Important:
- MCP ne "devine" pas ta `SUPABASE_SERVICE_ROLE_KEY`. En general, les secrets restent dans ton environnement/compte.
- Pour les operations destructrices (DELETE/DROP), il faut toujours une verification + confirmation explicite.

## 2) Quand utiliser MCP vs scripts du repo

Utilise **MCP** quand:
- tu veux comprendre l'etat actuel (schema/cache PostgREST/policies)
- tu veux faire un correctif rapide (ex: supprimer un mauvais seed, corriger une colonne)
- tu veux me donner des resultats (SELECT/describe) sans exposer des cles

Utilise les **scripts du repo** quand:
- tu veux du determinisme ("one command", pipeline complet)
- tu veux regenerer + uploader beaucoup de fichiers (ex: SVG pays)
- tu veux versionner la logique dans Git

## 3) Comment formuler une demande (template)

Quand tu me demandes une action Supabase, indique:

1. **Cible**:
   - table/bucket (ex: `public_cards`, `packs`, bucket `country-maps`)
2. **Operation**:
   - read (SELECT), write (INSERT/UPSERT), schema (ALTER/INDEX), storage upload/delete
3. **Scope**:
   - "sur tout" vs "uniquement le pack X" vs "uniquement les cartes taggees Y"
4. **Regles de securite**:
   - "dry-run d'abord" (SELECT count + exemples) puis execution
5. **Verification attendue**:
   - ex: `count avant/apres`, exemples de lignes, URLs, etc.

Exemple de demande "propre":

- "Via MCP: fais un dry-run `count` des cartes dans `public_cards` avec le tag `Maths`, montre 5 exemples (id, pack_slug, tags), puis supprime-les et re-montre les counts."

## 4) Playbook MCP: checks avant actions

Avant de modifier des donnees, fais toujours:

- Un `SELECT count(*)` avec le meme filtre que le DELETE/UPDATE
- Un `SELECT ... limit 5` pour confirmer que le filtre match bien les bonnes lignes
- Si update en masse: preferer `UPDATE ... WHERE ...` + `returning id` (ou un sample)

## 5) SQL utiles (copier/coller dans MCP)

Lister les tables du schema `public`:

```sql
select tablename
from pg_catalog.pg_tables
where schemaname = 'public'
order by tablename;
```

Voir les colonnes d'une table:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='public_cards'
order by ordinal_position;
```

Dry-run avant suppression de cartes (ex: tag):

```sql
select count(*) as n
from public.public_cards
where tags @> array['Géographie/Location']::text[];
```

Exemples avant suppression:

```sql
select id, pack_slug, tags
from public.public_cards
where tags @> array['Géographie/Location']::text[]
limit 10;
```

Supprimer (apres validation):

```sql
delete from public.public_cards
where tags @> array['Géographie/Location']::text[];
```

## 6) PostgREST schema cache (important)

Supabase expose la DB via PostgREST, qui cache le schema. Apres un `ALTER TABLE`, on peut voir des erreurs du style:

- "Could not find the 'bbox' column ... in the schema cache"

Pour forcer un reload (via SQL):

```sql
select pg_notify('pgrst', 'reload schema');
```

Ensuite, attendre quelques secondes et retester un `select` sur la/les colonnes.

## 7) Storage (buckets/objets) via MCP

Les operations typiques:

- Lister les buckets, verifier `country-maps`
- Lister les objets sous `svg-blue/`
- Uploader/overwrite en batch (si l'outil MCP le supporte)

Bonnes pratiques:
- Path deterministe: `country-maps/svg-blue/{ISO2}.svg`
- `cacheControl` court pendant l'iteration (ex: 300), puis remonter si besoin
- Si overwrite frequent: ajouter un `?v=<timestamp>` dans les URLs cote app (cache-busting)

## 8) Ce que j'ai besoin que tu confirmes quand c'est sensible

Je te demanderai une confirmation explicite pour:

- `DROP TABLE`, `TRUNCATE`, `DELETE` sans filtre tres strict
- Suppression d'objets Storage en masse
- Modification d'un champ utilise par l'app (ex: `packs.slug`)

## 9) Raccourci: si tu veux que j'utilise MCP

Ecris simplement:

- "Utilise MCP Supabase sur `reujhlbpmxyuqiscsldl` et fais: <action>"

Et precise:
- "dry-run d'abord" si tu veux une verification avant execution.

