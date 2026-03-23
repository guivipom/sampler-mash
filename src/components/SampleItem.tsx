import { formatDuration } from "../lib/formatDuration";

interface SampleItemProps {
  index: number;
  name: string;
  duration: number;
  isLoading: boolean;
  error: string | null;
  onRemove: () => void;
}

export function SampleItem({
  index,
  name,
  duration,
  isLoading,
  error,
  onRemove,
}: SampleItemProps) {
  const paddedIndex = index.toString().padStart(3, "0");

  function renderStatus() {
    if (isLoading) {
      return (
        <span
          aria-label="Loading"
          className="animate-pulse text-orange-700"
          role="status"
        >
          [LOADING]
        </span>
      );
    }
    if (error) {
      return (
        <span aria-label={error} className="text-red-600" role="alert">
          [ERR]
        </span>
      );
    }
    return (
      <span className="tabular-nums text-orange-600">
        {formatDuration(duration)}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-1 py-1 text-xs hover:bg-orange-950/30 ${error ? "opacity-60" : ""}`}
    >
      {/* Prompt */}
      <span className={`shrink-0 ${error ? "text-red-800" : "text-orange-600"}`}>
        &gt;
      </span>

      {/* Index */}
      <span className="w-8 shrink-0 tabular-nums text-orange-700">
        {paddedIndex}
      </span>

      {/* Filename */}
      <span className="min-w-0 flex-1 truncate text-orange-300" title={name}>
        {name}
      </span>

      {/* Dot fill — decorative, aria-hidden */}
      <span
        aria-hidden="true"
        className="shrink-0 overflow-hidden text-orange-900"
        style={{ width: "6rem", letterSpacing: "0.15em" }}
      >
        {"·".repeat(20)}
      </span>

      {/* Status: duration / loading / error */}
      <span className="w-16 shrink-0 text-right">{renderStatus()}</span>

      {/* Remove */}
      <button
        aria-label={`Remove ${name}`}
        className="ml-2 shrink-0 text-orange-800 transition-colors hover:text-red-500"
        onClick={onRemove}
        type="button"
      >
        [x]
      </button>
    </div>
  );
}
