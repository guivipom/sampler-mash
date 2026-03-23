import { useState, useEffect } from "react";
import { UploadButton, MAX_SAMPLES } from "./components/UploadButton";
import { SampleList } from "./components/SampleList";
import { useAudioEngine } from "./hooks/useAudioEngine";

const REJECTION_DISPLAY_MS = 5000;

function App() {
  const { samples, addFiles, removeSample } = useAudioEngine();
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!rejectionMessage) return;
    const timer = setTimeout(() => setRejectionMessage(null), REJECTION_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [rejectionMessage]);

  function handleFilesSelected(files: File[]) {
    void addFiles(files);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Sampler App</h1>
      </header>

      <main className="mx-auto max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <UploadButton
            currentCount={samples.length}
            maxCount={MAX_SAMPLES}
            onFilesSelected={handleFilesSelected}
            onRejected={setRejectionMessage}
          />
          <span className="text-sm text-gray-500">
            {samples.length}/{MAX_SAMPLES} samples
          </span>
        </div>

        {rejectionMessage && (
          <div
            aria-live="polite"
            className="mb-4 flex items-start justify-between rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300"
            role="alert"
          >
            <span>{rejectionMessage}</span>
            <button
              aria-label="Dismiss error"
              className="ml-4 shrink-0 text-red-400 hover:text-red-200"
              onClick={() => setRejectionMessage(null)}
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        <SampleList samples={samples} onRemove={removeSample} />
      </main>
    </div>
  );
}

export default App;
