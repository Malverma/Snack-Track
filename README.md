# SnackTrack

A simple calorie counter for Android and iOS, built with Expo (React Native + TypeScript).

- Log meals with a photo, calories, protein, fat and carbs. Empty fields count as 0.
- Each day starts a fresh log. Swipe left for the previous day, right for the next.
- Daily calorie goal shown as eaten / goal with a progress bar.
- Themes: dark or light mode and six accent colors.
- All data stays on the device (SQLite + local photo storage).

App ID: `com.malverma.snacktrack`. See [SPEC.md](SPEC.md) for the full spec.

## Run in development

```sh
npm install
npx expo start
```

## Build an Android APK

Requires JDK 17 and the Android SDK.

```sh
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

The `android/` and `ios/` folders are generated and not committed. Change native settings in `app.json`.
Release builds are currently signed with the debug key, which is fine for testing but not for publishing.
