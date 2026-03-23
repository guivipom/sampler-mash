import { useRef } from "react";

export const MAX_SAMPLES = 25;

const ACCEPTED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/vorbis",
]);

const ACCEPTED_EXTENSIONS = new Set([".mp3", ".wav", ".ogg"]);

function isAudioFile(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ACCEPTED_EXTENSIONS.has(ext);
}

interface UploadButtonProps {
  currentCount: number;
  maxCount?: number;
  onFilesSelected: (files: File[]) => void;
  onRejected: (message: string) => void;
}

export function UploadButton({
  currentCount,
  maxCount = MAX_SAMPLES,
  onFilesSelected,
  onRejected,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const atCapacity = currentCount >= maxCount;

  function handleButtonClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const validFiles = Array.from(fileList).filter(isAudioFile);
    const remaining = maxCount - currentCount;

    if (validFiles.length > remaining) {
      onRejected(
        `Cannot add ${validFiles.length} sample${validFiles.length === 1 ? "" : "s"}. ` +
          `Only ${remaining} slot${remaining === 1 ? "" : "s"} remaining (${currentCount}/${maxCount}).`,
      );
    } else if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    // Reset so the same file can be re-selected later
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
        aria-hidden="true"
        className="hidden"
        multiple
        onChange={handleChange}
        tabIndex={-1}
        type="file"
      />
      <button
        aria-label={
          atCapacity
            ? `Sample limit reached (${maxCount}/${maxCount})`
            : `Add samples, ${currentCount} of ${maxCount} used`
        }
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={atCapacity}
        onClick={handleButtonClick}
        type="button"
      >
        {atCapacity
          ? `Sample limit reached (${maxCount}/${maxCount})`
          : `Add Samples (${currentCount}/${maxCount})`}
      </button>
    </>
  );
}
