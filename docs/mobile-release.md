# Mobile release (TestFlight)

## Prereqs
- Apple Developer account
- Expo account (for EAS)
- Install EAS CLI: `npm i -g eas-cli`

## Configure app identifiers
Update `apps/mobile/app.json` with:
- `expo.name`
- `expo.slug`
- `expo.ios.bundleIdentifier` (ex: `com.v0latix.flashcards`)
- `expo.ios.buildNumber` (increment each release)

## Build for TestFlight
```
cd apps/mobile
eas login
eas build:configure
eas build --platform ios --profile production
```

## Submit to TestFlight
```
cd apps/mobile
eas submit --platform ios --profile production
```

## Env for builds
- Use EAS secrets for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Example:
```
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<project>.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-key>
```

## After upload
- Wait for processing in App Store Connect.
- Add internal testers in TestFlight.
