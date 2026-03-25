import { useState, useEffect } from "react";
import { UploadButton, MAX_SAMPLES } from "./components/UploadButton";
import { SampleList } from "./components/SampleList";
import { MashControls } from "./components/MashControls";
import { MashWaveform } from "./components/MashWaveform";
import { useAudioEngine } from "./hooks/useAudioEngine";

const REJECTION_DISPLAY_MS = 5000;

function App() {
  const {
    samples,
    addFiles,
    removeSample,
    previewSample,
    stopPreview,
    previewingId,
    generateMash,
    downloadMash,
    isRendering,
    mashBuffer,
  } = useAudioEngine();

  const hasReadySamples = samples.some((s) => s.buffer !== null && s.error === null);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!rejectionMessage) return;
    const timer = setTimeout(
      () => setRejectionMessage(null),
      REJECTION_DISPLAY_MS,
    );
    return () => clearTimeout(timer);
  }, [rejectionMessage]);

  function handleFilesSelected(files: File[]) {
    void addFiles(files);
  }

  return (
    <div className="min-h-screen bg-black font-mono text-orange-400">
      {/* Header */}
      <header className="border-b border-orange-900 px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold uppercase tracking-widest text-orange-300">
                SAMPLER // MASH SYSTEM
              </h1>
              <p className="mt-0.5 text-xs uppercase tracking-widest text-orange-800">
                NERV AUDIO DIVISION — v0.1.0
              </p>
            </div>
            <div className="text-right text-xs uppercase tracking-widest text-orange-800">
              <div>STATUS: <span className="text-orange-500">ONLINE</span></div>
              <div>
                BANK:{" "}
                <span className="text-orange-400">
                  {samples.length.toString().padStart(2, "0")}/{MAX_SAMPLES}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-6">
        {/* Warning alert */}
        {rejectionMessage && (
          <div
            aria-live="polite"
            className="mb-4 flex items-start justify-between border border-red-800 bg-red-950/20 px-4 py-3 text-xs text-red-400"
            role="alert"
          >
            <span>
              <span className="font-bold">[!] WARNING: </span>
              {rejectionMessage}
            </span>
            <button
              aria-label="Dismiss error"
              className="ml-4 shrink-0 uppercase tracking-wider text-red-600 hover:text-red-400"
              onClick={() => setRejectionMessage(null)}
              type="button"
            >
              [x]
            </button>
          </div>
        )}

        {/* Controls row */}
        <div className="mb-6 flex items-center justify-between border border-orange-900 px-4 py-3">
          <UploadButton
            currentCount={samples.length}
            maxCount={MAX_SAMPLES}
            onFilesSelected={handleFilesSelected}
            onRejected={setRejectionMessage}
          />
          <span className="text-xs uppercase tracking-widest text-orange-800">
            {samples.length.toString().padStart(2, "0")}/{MAX_SAMPLES} LOADED
          </span>
        </div>

        {/* Sample bank */}
        <SampleList
          samples={samples}
          previewingId={previewingId}
          onPreview={(id) =>
            previewingId === id ? stopPreview() : previewSample(id)
          }
          onRemove={removeSample}
        />

        {/* Mash engine controls */}
        <div className="mt-6">
          <MashControls
            hasReadySamples={hasReadySamples}
            isRendering={isRendering}
            onGenerate={() => void generateMash()}
          />
        </div>

        {/* Waveform display + playback + download */}
        <div className="mt-4">
          <MashWaveform
            mashBuffer={mashBuffer}
            isRendering={isRendering}
            onDownload={downloadMash}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
