# Mobile development

## Prereqs
- Install Expo Go on your iOS or Android device.

## Run
```
cd apps/mobile
npx expo start -c
```

## Smoke check
- Open the QR code in Expo Go.
- Home shows and "Play Session" opens a review session.
- Settings -> Open Media Test renders image, SVG flag, and LaTeX (may take a moment).
- Packs -> Open a pack -> Download pack -> Library shows imported cards.

## Notes
- LaTeX rendering uses a WebView with KaTeX from a CDN, so an active network is required for math.
