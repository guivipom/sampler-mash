import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import audioBufferToWav from "audiobuffer-to-wav";

interface MashWaveformProps {
  mashBuffer: AudioBuffer | null;
  isRendering: boolean;
  onDownload: () => void;
}

export function MashWaveform({
  mashBuffer,
  isRendering,
  onDownload,
}: MashWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialise / re-initialise WaveSurfer whenever the mash buffer changes
  useEffect(() => {
    if (!mashBuffer || !containerRef.current) return;

    // Tear down previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // Convert AudioBuffer → WAV Blob → object URL
    const wavArrayBuffer = audioBufferToWav(mashBuffer);
    const blob = new Blob([wavArrayBuffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;

    // Create WaveSurfer instance
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#fb923c",      // orange-400
      progressColor: "#f97316",  // orange-500
      cursorColor: "#fdba74",    // orange-300

      height: 80,
      barWidth: 2,
      barGap: 1,
      barRadius: 0,
      interact: true,
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    void ws.load(url);
    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      URL.revokeObjectURL(url);
      objectUrlRef.current = null;
    };
  }, [mashBuffer]);

  function handlePlayStop() {
    wavesurferRef.current?.playPause();
  }

  const hasBuffer = mashBuffer !== null;

  return (
    <div className="border border-orange-900 px-4 py-3">
      <div className="mb-2 text-xs uppercase tracking-widest text-orange-800">
        --- WAVEFORM ---
      </div>

      {!hasBuffer ? (
        <p className="py-4 text-xs uppercase tracking-widest text-orange-800">
          &gt; NO MASH GENERATED_
        </p>
      ) : (
        <>
          {/* WaveSurfer mounts into this div */}
          <div
            aria-label="Waveform display"
            className="mb-3 border border-orange-900"
            ref={containerRef}
          />

          <div className="flex items-center gap-4">
            <button
              aria-label={isPlaying ? "Stop mash" : "Play mash"}
              className="border border-orange-700 bg-black px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-400 transition-colors hover:border-orange-500 hover:bg-orange-950 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-orange-900 disabled:text-orange-800"
              disabled={isRendering}
              onClick={handlePlayStop}
              type="button"
            >
              {isPlaying ? "[ STOP ]" : "[ PLAY ]"}
            </button>

            <button
              aria-label="Download WAV"
              className="border border-orange-700 bg-black px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-400 transition-colors hover:border-orange-500 hover:bg-orange-950 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-orange-900 disabled:text-orange-800"
              disabled={isRendering}
              onClick={onDownload}
              type="button"
            >
              [ DOWNLOAD WAV ]
            </button>
          </div>
        </>
      )}
    </div>
  );
}
