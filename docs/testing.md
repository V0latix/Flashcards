# Testing guide

## Commands
- `npm run test` : run all tests once (Vitest).
- `npm run test:watch` : watch mode.
- `npm run test:ui` : Vitest UI.
- `npm run check` : lint + typecheck + tests (fails on error).

## What is covered
- **Leitner unit tests**: promotions, demotions, learned rules, session composition.
- **Renderer tests**: `resolveImageSrc` and Markdown image fallback.
- **UI smoke tests**: Home, ReviewSession, Settings danger zone, Library tag deletion.
- **Sync unit tests**: merge rules and deletion safeguards.
- **Supabase**: mocked listPacks with fixtures (no network).

## Fixtures
Located in `src/test/fixtures/`:
- `supabase.ts` : packs/public_cards mock data.

## Adding a test
1) Create `*.test.ts` or `*.test.tsx` in `src/`.
2) Use helpers from `src/test/utils.ts` for IndexedDB seeding.
3) Keep tests deterministic (fake timers, stub env, stub random if needed).

## Pre-push hook (optional)
Run the check before every push:

```
chmod +x scripts/prepush-check.sh
ln -sf ../../scripts/prepush-check.sh .git/hooks/pre-push
```

Disable hook:

```
rm .git/hooks/pre-push
```

## Limitations
- No real E2E tests or real Supabase network calls.
- UI tests are smoke-level, not full user journeys.
- Vitest uses a temp config in /tmp (see scripts/run-tests.sh) to avoid write issues.

## Manual sync checklist (web)
- Login on desktop, create 3 cards, review 2, wait 15s.
- Open iPhone Safari, login with same account, wait 15s.
- Verify the same cards and progress appear.
- Delete one card on iPhone, wait 15s, refresh desktop.
- Import a JSON pack, wait 15s, verify `user_cards` has new rows.
- Logout and confirm local anonymous mode still works.
