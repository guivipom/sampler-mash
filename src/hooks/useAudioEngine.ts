import { useState, useCallback } from "react";
import * as Tone from "tone";

export interface SampleEntry {
  id: string;
  name: string;
  buffer: AudioBuffer | null;
  duration: number;
  isLoading: boolean;
}

interface UseAudioEngineReturn {
  samples: SampleEntry[];
  addFiles: (files: File[]) => Promise<void>;
  removeSample: (id: string) => void;
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useAudioEngine(): UseAudioEngineReturn {
  const [samples, setSamples] = useState<SampleEntry[]>([]);

  const addFiles = useCallback(async (files: File[]): Promise<void> => {
    // Assign a stable id to each file up front
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
      })),
    ]);

    // Decode each file in parallel
    await Promise.all(
      entries.map(async ({ id, file }) => {
        try {
          await Tone.start();
          const arrayBuffer = await readFileAsArrayBuffer(file);
          const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);

          setSamples((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    buffer: audioBuffer,
                    duration: audioBuffer.duration,
                    isLoading: false,
                  }
                : s,
            ),
          );
        } catch {
          // Remove failed entries from state
          setSamples((prev) => prev.filter((s) => s.id !== id));
        }
      }),
    );
  }, []);

  const removeSample = useCallback((id: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { samples, addFiles, removeSample };
}
