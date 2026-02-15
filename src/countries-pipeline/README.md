# Countries Pipeline

This folder contains a Node-only pipeline (run with `tsx`) to:

1. Download Natural Earth Admin-0 Countries (110m)
2. Generate 1 deterministic SVG per country (zoom-region style)
3. Upload SVGs to Supabase Storage (`country-maps/svg/{ISO2}.svg`)
4. Upsert metadata to `public.countries`
5. Write a local preview grid (`out/preview.html`)

It is excluded from the Vite `tsconfig.app.json` build on purpose.

