# Sampler App — Project Plan

## Session Notes (last updated 2026-03-25)

### Key discoveries
- **`import type` is required** for all type-only imports from `types.ts` in this Vite project — using `import { RawAudioData }` instead of `import type { RawAudioData }` causes a runtime `SyntaxError` in the browser.
- **TypeScript strict generics on CI**: `AudioBuffer.copyToChannel()` expects `Float32Array<ArrayBuffer>` but `getChannelData()` returns `Float32Array<ArrayBufferLike>`. Fix: wrap `getChannelData()` result in `new Float32Array(...)`, and cast channel data with `as Float32Array<ArrayBuffer>` at the `copyToChannel` call site.
- The original slicer/interleaver approach (sequential chunks) was replaced with simultaneous-layer mixing. `slicer.ts` and `interleaver.ts` were never built and are no longer needed.
- **Tone.js mock pattern**: use `vi.hoisted` for mock setup; `Tone.Player` mock must be a real constructor function (not an arrow function).
- `useAudioEngine` tests also mock `../lib/mashPlayer` via `vi.mock` so hook tests don't depend on the full pipeline.

### Current state
- Steps 1–11 complete.
- **128 tests** across 12 files, all passing.
- App is fully wired: generate mash → waveform display → download WAV.
- Repo: `github.com/guivipom/sampler-mash`

---

## What it does

Users upload audio samples (MP3, WAV, OGG) through a file picker. The app randomly selects up to 4 of those samples, optionally reverses each one (50% chance), trims any longer than 10 seconds to 10 seconds, mixes them as simultaneous layers (all playing at once), and plays back the result. Users can preview individual samples, play the mash, and download the result as a WAV file.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| UI framework | React 19 + TypeScript | Component model, hooks, strong typing |
| Build tool | Vite | Fast dev server, HMR, Vite plugin ecosystem |
| Styling | Tailwind CSS v4 | Utility-first, Vite-native plugin |
| Audio engine | Tone.js | High-level Web Audio API abstraction, `ToneAudioBuffer.slice()`, `Tone.Offline()` |
| WAV export | audiobuffer-to-wav | Converts `AudioBuffer` to WAV `ArrayBuffer` |
| Waveform display | WaveSurfer.js | Canvas-based waveform renderer from an audio URL |
| Testing | Vitest + React Testing Library + jsdom | Fast, Vite-native, component + hook testing |

---

## Design

Evangelion / NERV-inspired terminal UI:
- Black background, monospace font throughout
- Orange/amber (`orange-400`) primary text, red accents for warnings/errors
- Terminal-style sample list: `> 001  kick.wav ···· 0:02.5  [▶] [x]`
- Uppercase labels, angular borders, no rounded corners
- Button commands in bracket notation: `[ LOAD SAMPLES  03/25 ]`

---

## Architecture

```
src/
├── components/
│   ├── UploadButton.tsx        # File picker, cap enforcement, MIME filtering
│   ├── SampleList.tsx          # List wrapper with section header + empty state
│   ├── SampleItem.tsx          # Terminal-style row: index, name, duration, preview, remove
│   ├── MashControls.tsx        # Generate mash button + rendering indicator (step 9)
│   └── MashWaveform.tsx        # WaveSurfer waveform + play/stop + download (step 10)
├── hooks/
│   └── useAudioEngine.ts       # Core hook: samples state, addFiles, removeSample,
│                               #            previewSample, stopPreview, previewingId
├── lib/
│   ├── formatDuration.ts       # Pure: seconds → "M:SS.d"
│   ├── sampleProcessor.ts      # Pure: select up to 4, trim to 10s, 50% reverse
│   ├── mashRenderer.ts         # Pure: mix RawAudioData[] into single simultaneous layer
│   ├── mashPlayer.ts           # createMashBuffer: process → render → AudioBuffer
│   └── wavExporter.ts          # AudioBuffer → WAV Blob → download
├── test/
│   └── setup.ts                # jest-dom matchers
├── types.ts                    # Sample, Chunk, RawAudioData interfaces
├── App.tsx                     # Root component
├── main.tsx                    # Entry point
└── index.css                   # Tailwind import + base layer
```

---

## Implementation Steps

### Step 1 — Project scaffold ✅
- Vite + React + TypeScript project
- Install: `tone`, `audiobuffer-to-wav`, `tailwindcss`, `@tailwindcss/vite`
- Install test deps: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- Configure Vitest with jsdom environment and jest-dom setup file
- Configure Tailwind CSS v4 via Vite plugin
- Clean Vite boilerplate, create directory structure, shared `types.ts`
- Smoke test: `App` renders heading

**Tests:** 2 (App smoke tests)

---

### Step 2 — File upload & sample list ✅
- `UploadButton` — file picker (no drag-and-drop), 25-sample cap, MIME/extension filtering
  - Rejects entire selection if it would exceed cap, shows error message
  - Button label: `[ LOAD SAMPLES  03/25 ]` / `[ LIMIT REACHED  25/25 ]`
- `SampleList` — section header, empty state `> NO SAMPLES LOADED_`, list of `SampleItem`
- `SampleItem` — terminal row with index, name, duration, loading spinner, remove button
- `useAudioEngine` (loading only) — `addFiles`, `removeSample`, per-file `isLoading` state
- `formatDuration` — pure function `seconds → "M:SS.d"`
- `App` wired up with rejection message (auto-dismiss after 5s)

**Key decisions:**
- Samples can have different lengths (no normalisation required)
- Chunk size fixed at 0.5s (no user control)
- Failed decodes show `[ERR]` inline (not silently dropped)

**Tests:** 44

---

### Step 3 — Audio loading pipeline & error state ✅
- `SampleEntry.error: string | null` — failed decodes marked `"DECODE FAILED"` instead of removed
- `previewSample(id)` — creates `Tone.Player`, plays buffer, auto-clears `previewingId` on end
- `stopPreview()` — stops and disposes active player
- `previewingId: string | null` — exposed for UI toggle state
- `removeSample` — stops preview if removing the currently playing sample
- `SampleItem` renders `[ERR]` with `role="alert"` when error is set

**Tests:** 60 (10 new)

---

### Step 4 — Preview playback wired into UI ✅
- `SampleItem` — new props `isPreviewing` and `onPreview`
  - `[▶]` when idle, `[■]` (pulsing) when previewing
  - Preview button disabled when `isLoading` or `error` is set
  - `aria-label` toggles between `"Preview {name}"` / `"Stop preview {name}"`
- `SampleList` — new props `previewingId` and `onPreview`
  - Computes `isPreviewing={previewingId === sample.id}` per item
- `App` — toggle logic: click previewing sample → `stopPreview()`, else → `previewSample(id)`

**Tests:** 70 (10 new)

---

### Step 5 — Sample Processor ✅
`src/lib/sampleProcessor.ts`

Pure function — no Tone.js dependency, operates on `RawAudioData`:

```ts
function processForMash(buffers: RawAudioData[]): RawAudioData[]
```

- Randomly selects up to 4 samples from the input using `Math.random()`
- For each selected sample:
  - Trims to 10s max: if `length > sampleRate * 10`, slice channel data at that frame
  - Reverses all channel data arrays with 50% probability (`Math.random() < 0.5`)
- Returns 1–4 processed `RawAudioData` objects (copies, not mutations)
- Empty input → empty array

**Tests:** ~10
- Selects at most 4 when more than 4 are provided
- Selects all when 4 or fewer are provided
- Trims samples longer than 10s to exactly 10s
- Leaves samples ≤ 10s untouched
- Reverses channel data when `Math.random()` returns < 0.5
- Does not reverse when `Math.random()` returns ≥ 0.5
- Empty input → empty output
- Sample rate and channel count are preserved after trimming/reversing

---

### Step 6 — Mash Renderer ✅
`src/lib/mashRenderer.ts`

Pure function — no Tone.js dependency:

```ts
function renderMash(buffers: RawAudioData[]): RawAudioData
```

- All buffers start at t=0 (simultaneous layers, not sequential)
- Output length = length of the longest input buffer
- Shorter buffers are zero-padded for remaining frames
- Channel handling: if any input is stereo, mono inputs are upmixed (channel duplicated to L and R) before mixing; output is stereo
- Amplitude: raw sum, unclamped (no normalization, no clipping)
- Returns a single `RawAudioData`

**Tests:** ~8
- Two equal-length buffers are summed sample-by-sample correctly
- Shorter buffer is zero-padded, longer buffer values unchanged after shorter ends
- Single buffer passes through unchanged
- Empty input → returns a zero-length RawAudioData
- Mono + mono stays mono
- Stereo + stereo stays stereo
- Mono + stereo: mono is upmixed to stereo before mixing

---

### Step 7 — Mash Playback Pipeline ✅
`src/lib/mashPlayer.ts`

```ts
async function createMashBuffer(buffers: RawAudioData[]): Promise<AudioBuffer>
```

- Calls `processForMash(buffers)` to select, trim, and optionally reverse samples
- Calls `renderMash(processed)` to mix them into a single `RawAudioData`
- Converts `RawAudioData` to a real `AudioBuffer` via `AudioContext.createBuffer` + `copyToChannel`
- Returns the `AudioBuffer` (used for both playback and WAV export)

`useAudioEngine` extended with:
- `playMash()` — runs `createMashBuffer`, plays result via `Tone.Player`, caches `mashBuffer`
- `isRendering: boolean` — true while pipeline is running
- `mashBuffer: AudioBuffer | null` — cached after first render, invalidated on sample add/remove

**Tests:** ~5
- `createMashBuffer` calls `processForMash` and `renderMash` in order
- Resulting `AudioBuffer` has correct length and sample rate
- `playMash` sets `isRendering` to true then false
- `mashBuffer` is cached and reused on second call
- `mashBuffer` is invalidated when samples change

---

### Step 8 — WAV export ✅
`src/lib/wavExporter.ts`

```ts
function exportWav(buffer: AudioBuffer, filename?: string): void
```

- Converts `AudioBuffer` to WAV using `audiobuffer-to-wav`
- Creates a `Blob`, generates an object URL, triggers download via `<a>` click
- Validates WAV header: correct sample rate, bit depth, channel count
- Cleans up the object URL after download

**Tests:** ~4
- Produces a Blob with `audio/wav` type
- WAV header contains correct metadata
- Triggers download with correct filename
- Handles mono and stereo buffers

---

### Step 9 — MashControls component ✅
`src/components/MashControls.tsx`

```
--- MASH ENGINE ────────────────────────── ---
[ GENERATE MASH ]        [RENDERING...]
```

Props:
```ts
interface MashControlsProps {
  hasReadySamples: boolean;
  isRendering: boolean;
  onGenerate: () => void;
}
```

- `[ GENERATE MASH ]` — disabled when no ready samples or rendering; every click generates a new randomised mash
- `[RENDERING...]` — pulsing status shown while the pipeline is running
- Terminal styling consistent with the rest of the UI

**Tests:** ~5
- Button disabled when no ready samples
- Button disabled while rendering
- Rendering indicator visible while rendering
- Calls `onGenerate` on click
- Not disabled when samples ready and not rendering

---

### Step 10 — MashWaveform component ✅
`src/components/MashWaveform.tsx`

Renders the waveform of the generated mash using **WaveSurfer.js**. Displays only the final mixed-down `AudioBuffer`.

```
--- WAVEFORM ────────────────────────────── ---
[                 waveform here               ]
[ PLAY ]   [ DOWNLOAD WAV ]
```

Props:
```ts
interface MashWaveformProps {
  mashBuffer: AudioBuffer | null;
  isRendering: boolean;
  onDownload: () => void;
}
```

- Empty state when `mashBuffer` is null: shows `> NO MASH GENERATED_`
- When `mashBuffer` changes, converts to WAV Blob via `audiobuffer-to-wav` → object URL, loads into WaveSurfer
- `[ PLAY ]` / `[ STOP ]` toggle using WaveSurfer's internal player
- `[ DOWNLOAD WAV ]` calls `onDownload`
- Amber waveform on black background, terminal styling
- Cleans up WaveSurfer instance and object URL on unmount / buffer change

**Tests:** ~6
- Empty state renders when no buffer
- Waveform container renders when buffer is present
- Download button calls handler
- Play/stop toggle works
- Disabled while rendering

---

### Step 11 — Wire everything into App.tsx ✅
`src/App.tsx` + `src/hooks/useAudioEngine.ts`

`useAudioEngine` extended with:
- `generateMash(): Promise<void>` — runs `createMashBuffer`, caches as `mashBuffer`, sets `isRendering`
- `downloadMash(): void` — calls `exportWav(mashBuffer)` when buffer is available
- `mashBuffer: AudioBuffer | null` — exposed in return value (already exists internally)
- `isRendering: boolean` — already exists internally

`App.tsx` wired up:
- `MashControls` placed below the sample list
- `MashWaveform` placed below `MashControls`
- `hasReadySamples` = at least one sample with `buffer !== null` and `error === null`
- `mashBuffer` invalidated when samples change (add/remove)

`App.test.tsx` integration tests (~5):
- Generate button disabled with no samples
- Generate button enabled with at least one loaded sample
- Waveform section appears after generation
- Download calls exporter
- `mashBuffer` reset when a sample is removed

---

## Testing Strategy

### Philosophy
- **Pure logic** (slicer, interleaver, formatDuration, wavExporter) — tested without mocks, operate on plain typed arrays
- **Hooks** — tested with `vi.mock('tone', ...)` using `vi.hoisted` for proper hoisting
- **Components** — tested with React Testing Library, query by role/text not class names
- **Integration** — `App.test.tsx` verifies full component wiring

### Mock patterns
```ts
// Tone.js mock (hoisted for vi.mock compatibility)
const { mockDecodeAudioData, mockStart } = vi.hoisted(() => ({
  mockDecodeAudioData: vi.fn(),
  mockStart: vi.fn().mockResolvedValue(undefined),
}));

// Tone.Player mock (must be a real constructor function, not arrow fn)
const { MockPlayer } = vi.hoisted(() => {
  function MockPlayer(this: Record<string, unknown>) {
    this.toDestination = function(this: unknown) { return this; };
    this.start = function(this: unknown) { return this; };
    this.stop = vi.fn();
    this.dispose = vi.fn();
  }
  return { MockPlayer };
});
```

### Test count targets

| Step | New tests | Cumulative |
|------|-----------|------------|
| 1 — Scaffold | 2 | 2 |
| 2 — Upload & list | 42 | 44 |
| 3 — Audio pipeline | 16 | 60 |
| 4 — Preview wiring | 10 | 70 |
| 5 — Sample Processor | ~10 | ~80 |
| 6 — Mash Renderer | ~8 | ~88 |
| 7 — Mash playback | ~5 | ~93 |
| 8 — WAV export | 6 | 113 |
| 9 — MashControls | ~5 | ~118 |
| 10 — MashWaveform | ~6 | ~124 |
| 11 — Wire App.tsx | ~5 | ~129 |

---

## CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)
Three jobs, strictly ordered:

1. **CI** — lint → tsc → test → build (runs on every push and PR)
2. **Deploy Preview** — Vercel preview URL (PRs only, blocked on CI)
3. **Deploy Production** — Vercel production (merge to `main` only, blocked on CI)

### Vercel
- Hosting platform for the static frontend
- Automatic Git deploys **disabled** (Ignored Build Step: `exit 1`)
- GitHub Actions drives all deploys via Vercel CLI with `--prebuilt` flag
- Three GitHub secrets required: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### Flow
```
PR opened
  └── CI (lint → tsc → test → build)
        └── ✅ Deploy Preview → preview URL in PR checks

Merge to main
  └── CI (lint → tsc → test → build)
        └── ✅ Deploy Production → production URL
```

---

## Deferred / Out of Scope

- Drag-and-drop upload (replaced by file picker)
- User-configurable chunk size (fixed at 0.5s)
- Sequential chunk interleaving (replaced by simultaneous layer mixing in step 6)
- Waveform visualisation
- CRT scanline / full Evangelion aesthetic (custom fonts, hazard stripes, animated boot sequence)
- Docker (no server runtime, not needed for static frontend)
