# GroupFace

An open-source Android app that automatically groups your photos by the people in them — entirely on-device, no cloud, no server.

---

## What it does

GroupFace scans your photo library, detects every face in every photo, and clusters them by identity using face embeddings. You can then assign a name and contact to each group and share photos with that person directly.

Everything runs locally on your device. No photo ever leaves your phone.

---

## How it works

```
Photo picked by user
        │
        ▼
┌───────────────────┐
│   ML Kit          │  Face detection — finds bounding boxes
│   Face Detector   │  of every face in the image
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   FaceNet         │  Converts each face crop into a
│   (TFLite model)  │  192-dimensional embedding vector
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   DBSCAN          │  Groups embeddings by cosine similarity
│   Clustering      │  (threshold adjustable in Settings)
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   SQLite          │  Persists photos, faces, group_ids,
│   Database        │  contact labels, reference embeddings
└───────────────────┘
        │
        ▼
     Groups screen — browse by person, assign name/contact, share
```

### Background processing

When you select photos and tap **Group**, the entire pipeline runs as an Android Foreground Service via `react-native-background-actions`. A persistent notification shows live progress (`X of N photos processed`) with a progress bar. You can navigate away or lock your screen — processing continues. Tapping the notification brings you back to the app.

Processing speed adapts automatically to the device:
- Android 7 and below: conservative pacing to protect low-RAM devices
- Android 8–9: moderate pacing
- Android 10+: full speed, no artificial delay

---

## Features

- **On-device face grouping** — no internet required
- **Background processing** with notification progress bar
- **Adjustable similarity threshold** — from very loose to very strict matching
- **Assign contacts** to groups — link a face cluster to a person in your contacts
- **Share photos** by group — send all photos of a person via any share target
- **Show all albums** toggle — include WhatsApp, Screenshots, Downloads etc.
- **Merge groups** — manually combine two groups that belong to the same person
- **Clean database** — reset and reprocess from scratch
- **ARM-only APK** — no emulator bloat, optimized for real devices

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React Native 0.84, NativeWind (Tailwind) |
| Navigation | React Navigation (bottom tabs) |
| Face detection | ML Kit Face Detection |
| Face embedding | FaceNet (TFLite, 192-dim) |
| Clustering | DBSCAN (custom Kotlin implementation) |
| Database | SQLite via `react-native-sqlite-2` |
| Background task | `react-native-background-actions` (Android Foreground Service) |
| Photo access | `@react-native-camera-roll/camera-roll` |
| List rendering | `@shopify/flash-list` |

---

## Project structure

```
src/
  database/
    DatabaseInit.ts    — SQLite table creation and migrations
    photosDb.ts        — insert/query photos
    facesDb.ts         — insert/query face embeddings
    groupsDb.ts        — insert/query/update groups
    CheckDb.ts         — debug: print table contents
    CleanDb.ts         — drop tables
  ml/
    FaceProcessing.ts  — orchestrates detection → embedding → clustering → DB insert
  native/
    DirectShare.ts     — Android direct share sheet
  backgroundGrouping.ts — foreground service wrapper, progress events
  settings.ts          — threshold, show-all, auto-merge (persisted to JSON)

tabs/
  HomeScreen.tsx       — photo grid, selection, grouping trigger, progress banner
  GroupsScreen.tsx     — browse groups, assign contacts, merge, share, delete
  InsertPhotoScreen.tsx
  photoShowcase.tsx    — full-screen photo viewer
  SettingsScreen.tsx   — threshold slider, show-all toggle, auto-merge toggle
  dbFunctionality.tsx  — debug tools

android/app/src/main/java/com/groupface/
  faceprocessing/
    FaceProcessingModule.kt   — RN native module bridge
    FaceDetectorModule.kt     — ML Kit face detector
    FaceEmbeddingModule.kt    — TFLite FaceNet inference
    DbscanClusteringModule.kt — DBSCAN clustering algorithm
    FaceProcessingPackage.kt  — registers the native module
```

---

## Building

### Prerequisites

- Node 18+
- JDK 17
- Android SDK with NDK
- A connected Android device or emulator (ARM recommended)

### Development

```bash
npm install
npx react-native start --reset-cache   # terminal 1 — Metro bundler
npx react-native run-android           # terminal 2 — builds and installs debug APK
```

### Release APK (ARM only, split by architecture)

```bash
cd android && ./gradlew assembleRelease
```

Output APKs:
- `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk` — modern phones (2015+)
- `android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk` — older 32-bit phones

Most users want `arm64-v8a`.

---

## Permissions used

| Permission | Why |
|---|---|
| `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` | Access photos from the gallery |
| `READ_CONTACTS` | Link face groups to contacts |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_DATA_SYNC` | Keep grouping alive in background |
| `POST_NOTIFICATIONS` | Show progress notification (Android 13+) |
| `WAKE_LOCK` | Prevent CPU sleep during background processing |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| Similarity threshold | 0.60 | Cosine distance cutoff for grouping faces. Lower = more faces per group. Higher = stricter separation. |
| Show all albums | Off | When off, shows Camera Roll only. When on, includes all albums (WhatsApp, Downloads, etc.) |
| Auto-merge contacts | Off | Automatically merge groups that match the same contact |

---

## License

MIT

---

# Getting Started (development)

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
