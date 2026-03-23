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
        `CANNOT ADD ${validFiles.length} SAMPLE${validFiles.length === 1 ? "" : "S"}. ` +
          `ONLY ${remaining} SLOT${remaining === 1 ? "" : "S"} REMAINING (${currentCount}/${maxCount}).`,
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
            ? `Sample limit reached ${maxCount} of ${maxCount}`
            : `Load samples, ${currentCount} of ${maxCount} used`
        }
        className="border border-orange-700 bg-black px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-400 transition-colors hover:border-orange-500 hover:bg-orange-950 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-orange-900 disabled:text-orange-800"
        disabled={atCapacity}
        onClick={handleButtonClick}
        type="button"
      >
        {atCapacity
          ? `[ LIMIT REACHED  ${maxCount}/${maxCount} ]`
          : `[ LOAD SAMPLES  ${currentCount.toString().padStart(2, "0")}/${maxCount} ]`}
      </button>
    </>
  );
}
