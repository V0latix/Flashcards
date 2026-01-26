# v1 backlog (mobile)

## Auth + sync
- Supabase auth (email + magic link).
- Sync review state + logs with conflict strategy (client wins vs timestamp).
- Background sync + manual "Sync now" action.

## Storage
- Migrate AsyncStorage to SQLite for cards + logs.
- Add migration tooling (export/import, schema versioning).

## Media
- Cache remote images locally with expiry (avoid re-download).
- Optional offline pack media bundle for Supabase packs.

## Quality
- Deterministic session replay for debugging (seeded RNG on demand).
- Crash reporting and simple analytics (opt-in).
