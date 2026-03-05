# VoiceStory

A personal, single-user Android app for voice-driven story writing. Speak into the mic, Deepgram transcribes in real-time, and the result exports as a `.txt` file. No backend, no auth, no Play Store — APK sideloaded onto one personal device.

## Features

- Real-time voice transcription via Deepgram nova-2
- Spoken punctuation commands (`"period"`, `"comma"`, `"paragraph"`)
- `"delete last sentence"` voice command to undo
- Live interim transcript shown in grey while speaking
- Export to `.txt` with a custom filename via Android share sheet

## Tech stack

- React Native + Expo SDK 55
- expo-av — microphone access and audio recording
- expo-file-system — reading audio chunks, writing export file
- expo-sharing — Android native share sheet
- Deepgram nova-2 — streaming transcription via WebSocket (no SDK, raw WebSocket)
- EAS Build — cloud APK builds

## Project structure

```
app/
  index.jsx             single screen, root component
components/
  RecordButton.jsx      animated pulse button (circle = mic, square = stop)
  TextPreview.jsx       scrollable live transcript display
  ExportModal.jsx       bottom sheet for naming and exporting
hooks/
  useDeepgram.js        WebSocket connection + audio streaming logic
  useCommandParser.js   spoken command → formatting substitutions
utils/
  exportText.js         writes .txt file and opens share sheet
index.js                registerRootComponent entry point
app.config.js           Expo config with EAS projectId and API key injection
eas.json                EAS build profiles
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get a Deepgram API key

Sign up at [deepgram.com](https://deepgram.com) and create an API key in the console. The free tier is enough for personal use.

### 3. Log in to EAS (first time only)

```bash
eas login
```

### 4. Set the API key as an EAS environment variable

The key is injected at build time via `app.config.js` using `process.env.DEEPGRAM_API_KEY`. EAS cloud builds do **not** read `.env.local` — you must register the key as an EAS environment variable so it is available during the build:

```bash
eas env:create
```

When prompted:
- **Variable name:** `DEEPGRAM_API_KEY`
- **Value:** your Deepgram API key
- **Visibility:** Secret
- **Scope:** Project
- **Environment:** All

You only need to do this once. Verify it was saved with:

```bash
eas env:list
```

> **Local development note:** if you ever run the app via a local dev server, create a `.env.local` file in the project root with `DEEPGRAM_API_KEY=your_key_here`. This file is gitignored and is only used locally — it has no effect on EAS cloud builds.

### 5. Build the APK

```bash
eas build --platform android --profile preview
```

The build runs in the cloud. Free tier queue is typically 60–90 minutes. The download link appears at [expo.dev](https://expo.dev/accounts/danielrcamelo/projects/voice-story/builds) when done.

### 5. Install on your phone

Download the APK → enable "Install from unknown sources" → install.

## Voice commands

| Say | Result |
|---|---|
| "period" | `. ` |
| "comma" | `, ` |
| "paragraph" | new paragraph (`\n\n`) |
| "delete last sentence" | removes last sentence |

Commands apply only to finalized transcript segments, not interim results.

## Export flow

1. Tap **Export** — a bottom sheet opens
2. Filename is pre-filled with a timestamp (e.g. `story_2026-03-03_14h32`)
3. Rename or leave as-is, tap **Save**
4. Android share sheet opens — pick Downloads, Drive, etc.

## Gotchas

- **Expo Go will not work** — `expo-av` native module is not included in Expo Go. Always test via APK.
- **Do not add expo-router** — single screen app, and it pulls in react-dom which breaks the build.
- **Do not commit `.env.local`** — it is gitignored, keep it that way.
- **`.env.local` does not work for EAS builds** — EAS cloud builds ignore it. Register the key via `eas env:create` instead (see Setup step 4).
- **If you see "Recording error / WebSocket error"** — the API key is missing or invalid in the build. Run `eas env:list` to confirm it is registered, then rebuild.

## Pending features

- [ ] Portuguese language support (`pt-BR`) with PT voice commands
- [ ] Tap-to-edit the transcript before export
