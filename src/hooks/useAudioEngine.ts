import { useState, useCallback, useRef } from "react";
import * as Tone from "tone";

export interface SampleEntry {
  id: string;
  name: string;
  buffer: AudioBuffer | null;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

interface UseAudioEngineReturn {
  samples: SampleEntry[];
  addFiles: (files: File[]) => Promise<void>;
  removeSample: (id: string) => void;
  previewSample: (id: string) => void;
  stopPreview: () => void;
  previewingId: string | null;
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () =>
      reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useAudioEngine(): UseAudioEngineReturn {
  const [samples, setSamples] = useState<SampleEntry[]>([]);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const playerRef = useRef<Tone.Player | null>(null);

  const addFiles = useCallback(async (files: File[]): Promise<void> => {
    const entries: Array<{ id: string; file: File }> = files.map((file) => ({
      id: generateId(),
      file,
    }));

    // Immediately add all entries in loading state
    setSamples((prev) => [
      ...prev,
      ...entries.map(({ id, file }) => ({
        id,
        name: file.name,
        buffer: null,
        duration: 0,
        isLoading: true,
        error: null,
      })),
    ]);

    // Decode each file in parallel
    await Promise.all(
      entries.map(async ({ id, file }) => {
        try {
          await Tone.start();
          const arrayBuffer = await readFileAsArrayBuffer(file);
          const audioBuffer =
            await Tone.getContext().decodeAudioData(arrayBuffer);

          setSamples((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    buffer: audioBuffer,
                    duration: audioBuffer.duration,
                    isLoading: false,
                    error: null,
                  }
                : s,
            ),
          );
        } catch {
          setSamples((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    isLoading: false,
                    error: "DECODE FAILED",
                  }
                : s,
            ),
          );
        }
      }),
    );
  }, []);

  const removeSample = useCallback(
    (id: string) => {
      // Stop preview if we're removing the currently previewing sample
      if (previewingId === id) {
        playerRef.current?.stop();
        playerRef.current?.dispose();
        playerRef.current = null;
        setPreviewingId(null);
      }
      setSamples((prev) => prev.filter((s) => s.id !== id));
    },
    [previewingId],
  );

  const stopPreview = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.stop();
      } catch {
        // Player may already be stopped
      }
      playerRef.current.dispose();
      playerRef.current = null;
    }
    setPreviewingId(null);
  }, []);

  const previewSample = useCallback(
    (id: string) => {
      const sample = samples.find((s) => s.id === id);
      if (!sample?.buffer) return;

      // Stop any currently playing preview first
      stopPreview();

      const player = new Tone.Player(sample.buffer).toDestination();
      playerRef.current = player;
      setPreviewingId(id);

      player.start();

      // Auto-clear previewingId when playback ends
      const durationMs = sample.duration * 1000;
      setTimeout(() => {
        setPreviewingId((current) => (current === id ? null : current));
        if (playerRef.current === player) {
          playerRef.current = null;
        }
      }, durationMs + 100);
    },
    [samples, stopPreview],
  );

  return {
    samples,
    addFiles,
    removeSample,
    previewSample,
    stopPreview,
    previewingId,
  };
}
