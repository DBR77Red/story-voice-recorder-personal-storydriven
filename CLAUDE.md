# VoiceStory — Claude Code Context

## What this app is
A personal, single-user Android app for voice-driven story writing. The user speaks into the mic, Deepgram transcribes in real-time, spoken punctuation commands are converted to formatting, and the result can be exported as a `.txt` file. No backend. No auth. No Play Store. APK sideloaded onto one personal device.

## Core design principles
- **Dead simple** — one screen, minimal UI, no navigation
- **Fast sessions** — short bursts of dictation, quick export, move on
- **No backend** — Deepgram is called directly via WebSocket from the app
- **Personal use only** — never publish to Play Store, no multi-user concerns

---

## Tech stack
- **React Native** with **Expo SDK 55**
- **expo-av** — microphone access and audio recording
- **expo-file-system** — reading audio chunks, writing .txt export file
- **expo-sharing** — Android native share sheet for .txt export
- **expo-constants** — reading API key injected at build time
- **EAS Build** — cloud APK builds, `eas build --platform android --profile preview`
- **Deepgram nova-2** — streaming transcription via WebSocket

## NOT in this project
- No expo-router (removed — caused react-dom dependency conflicts)
- No react-dom (not a web app)
- No backend / Replit runtime
- No database
- No auth

---

## Folder structure
```
/app
  index.jsx             ← single screen, root component
/components
  RecordButton.jsx      ← animated pulse button, circle=mic / square=stop
  TextPreview.jsx       ← scrollable live transcript display
  ExportModal.jsx       ← bottom sheet modal for naming and exporting
/hooks
  useDeepgram.js        ← WebSocket connection + audio streaming logic
  useCommandParser.js   ← spoken command → formatting substitutions
/utils
  exportText.js         ← writes .txt file + opens share sheet
index.js                ← registerRootComponent entry point
app.config.js           ← Expo config, includes EAS projectId + deepgramApiKey
eas.json                ← EAS build profiles (preview → apk, production → apk)
.env.local              ← DEEPGRAM_API_KEY (never commit this)
```

---

## Entry point
`package.json` main field is `index.js` (NOT expo-router/entry):
```json
"main": "index.js"
```

`index.js`:
```js
import { registerRootComponent } from 'expo';
import App from './app/index';
registerRootComponent(App);
```

---

## API key setup
The Deepgram API key is injected at build time via `app.config.js`:
```js
extra: {
  deepgramApiKey: process.env.DEEPGRAM_API_KEY,
  eas: {
    projectId: "d9f2b2a6-fd97-4aa7-899a-3450a688ed8a"
  }
}
```

In `.env.local`:
```
DEEPGRAM_API_KEY=your_key_here
```

Read in the hook via:
```js
const apiKey = Constants.expoConfig?.extra?.deepgramApiKey ?? '';
```

---

## Deepgram WebSocket approach
- **Why WebSocket and not SDK:** leaner, no extra dependency, full control
- **URL:** `wss://api.deepgram.com/v1/listen`
- **Model:** nova-2
- **Android encoding:** AMR-WB (`amr-wb`), 16000hz, mono — natively supported by Android MediaRecorder
- **iOS encoding:** LinearPCM WAV (`linear16`), 16000hz, mono
- **Chunking:** audio file polled every 250ms, new bytes sent as binary Uint8Array
- **Header skip:** AMR-WB = 9 bytes, WAV = 44 bytes — skipped on first read
- **interim_results:** true — shows live grey text while speaking
- **punctuate:** false — punctuation handled by voice commands instead
- **CloseStream:** sent before closing WebSocket to flush buffered audio:
```js
ws.send(JSON.stringify({ type: 'CloseStream' }));
```

---

## Voice commands
Handled in `useCommandParser.js`. Applied to finalized transcripts only.

| User says | Result |
|---|---|
| "period" | `. ` |
| "comma" | `, ` |
| "paragraph" | `\n\n` |
| "delete last sentence" / "delete the last sentence" | removes last sentence from buffer |

**Important:** DELETE_PATTERN uses `/i` flag only, NOT `/gi` — the `g` flag causes `.test()` to alternate true/false due to stateful `lastIndex`.

```js
const DELETE_PATTERN = /\bdelete( the)? last sentence\b/i;
```

---

## Export flow
1. User taps Export → `ExportModal` opens as bottom sheet
2. Filename pre-filled with timestamp: `story_2026-03-03_14h32`
3. User can rename or leave as-is, taps Save
4. `exportStoryText()` writes `.txt` to `documentDirectory`
5. Android native share sheet opens — user picks destination (Downloads, Drive, etc.)

---

## Build process
```bash
# Install dependencies
npm install

# Login to EAS (first time)
eas login

# Build APK
eas build --platform android --profile preview
```
- Free tier queue can be 60-90 minutes
- Download link appears at https://expo.dev/accounts/danielrcamelo/projects/voice-story/builds
- Install on phone: download APK → "Install from unknown sources" → install

---

## Known issues / gotchas
- **Expo Go cannot run this app** — `expo-av` native module (`ExponentAV`) is not included in Expo Go. Always test via APK.
- **Free tier build queue** — can be 60-90 min. Paid tier is faster.
- **`npm ci` requires lock file sync** — always run `npm install` locally before pushing if you add/remove packages, so `package-lock.json` is up to date.
- **Windows PowerShell** — use `rm -r -force node_modules` not `rm -rf`

---

## Pending features (not yet built)
- [ ] **Portuguese support** — add `language` param to useDeepgram, toggle `en`/`pt-BR` in header, add PT voice commands (`ponto`, `vírgula`, `parágrafo`, `apagar última frase`) to useCommandParser alongside EN commands
- [ ] **CloseStream on stop** — already added to useDeepgram.stopRecording
- [ ] **Text editing** — allow tapping the text area to manually edit before export

---

## What NOT to do
- Do NOT add expo-router — this is a single screen app, it's not needed and causes web dependency conflicts
- Do NOT add react-dom — this is not a web app
- Do NOT add a backend — Deepgram is called directly from the client
- Do NOT publish to Play Store — personal use only, APK sideload only
