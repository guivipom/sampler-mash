# Sampler App

A frontend-only web application for audio sampling and mashing. Upload multiple audio samples (MP3, WAV, OGG), slice them into equal chunks, interleave the chunks across all samples, and play back or download the result as a WAV file.

## Tech Stack

- **React 19** + **TypeScript** - UI framework
- **Vite** - Build tool with HMR
- **Tailwind CSS v4** - Styling
- **Tone.js** - Audio engine & processing
- **Vitest** + **React Testing Library** - Testing
- **jsdom** - Browser environment for tests

## Features

- 🎵 Drag-and-drop audio upload (MP3, WAV, OGG)
- 🔪 Automatic audio slicing into equal chunks
- 🎚️ Interleaved playback of sample chunks
- ▶️ Real-time preview of individual samples
- 💾 Export mashed audio as WAV file
- ✅ Comprehensive unit & component tests

## Project Setup

### Prerequisites

- Node.js >= 20.19.0
- pnpm 10.4.0+

### Installation

```bash
cd sampler-app
pnpm install
```

## Running the App

### Development Server

Start the dev server with hot module reload (HMR):

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

Compile TypeScript and bundle for production:

```bash
pnpm build
```

Output is in `dist/`.

### Preview Built App

Serve the production build locally:

```bash
pnpm preview
```

## Testing

### Run Tests Once

```bash
pnpm test
```

### Watch Mode (re-run on file changes)

```bash
pnpm test:watch
```

Tests use **Vitest** with **jsdom** environment and **React Testing Library**. Each feature includes:
- **Unit tests** for pure functions (slicers, interleavers, WAV export)
- **Hook tests** for audio engine & drag-drop logic
- **Component tests** for UI interactions
- **Integration tests** for the full workflow

## Linting

Check code quality:

```bash
pnpm lint
```

## Architecture

### Directory Structure

```
src/
├── components/        # React components (DropZone, SampleList, PlayerControls, etc.)
├── hooks/             # Custom React hooks (useAudioEngine, useDragDrop)
├── lib/               # Pure utility functions (slicer, interleaver, wavExporter)
├── test/              # Test setup & utilities
├── types.ts           # TypeScript interfaces (Sample, Chunk, RawAudioData)
├── App.tsx            # Root component
├── main.tsx           # React entry point
└── index.css          # Tailwind imports
```

### Testing Strategy

- **Pure functions** (lib/) are fully tested without mocks (operate on typed arrays, not Tone.js)
- **Hooks** are tested with mocked Tone.js APIs (verify correct calls, not actual audio)
- **Components** are tested with React Testing Library (user interactions & state)
- **Integration tests** verify the full audio pipeline

See the [testing strategy](./TESTING.md) for details.

## Audio Processing Pipeline

1. **File Upload**: User drags audio files into DropZone
2. **Decode**: Files are decoded into AudioBuffer via Tone.js `decodeAudioData()`
3. **Slice**: Each AudioBuffer is divided into equal-duration chunks (default 0.5s per chunk)
4. **Interleave**: Chunks are round-robin mixed (chunk 0 from sample A, chunk 0 from sample B, chunk 1 from sample A, etc.)
5. **Render**: Interleaved chunks are concatenated and played or exported via `Tone.Offline()`
6. **Export**: Output AudioBuffer is converted to WAV and downloaded

## Development Notes

- **Tone.js + React**: Tone.js context is initialized on first user interaction (due to browser audio policy)
- **Testing Tone.js**: Core audio logic is decoupled from Tone.js to keep tests fast and mock-free
- **Styling**: Tailwind CSS v4 uses CSS-based configuration (no `tailwind.config.js`)

## Next Steps

- Step 2: Build DropZone component with drag-drop upload
- Step 3: Implement useAudioEngine hook for audio decoding
- Step 4: Build SampleList & SampleItem components
- Step 5: Implement slicer pure function with tests
- Step 6: Implement interleaver pure function with tests
- Step 7: Build mash playback pipeline
- Step 8: Implement WAV export
- Step 9: Build PlayerControls component
- Step 10: Wire everything together in App.tsx
