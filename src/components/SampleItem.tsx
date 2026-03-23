import { formatDuration } from "../lib/formatDuration";

interface SampleItemProps {
  name: string;
  duration: number;
  isLoading: boolean;
  onRemove: () => void;
}

export function SampleItem({
  name,
  duration,
  isLoading,
  onRemove,
}: SampleItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium text-gray-100"
            title={name}
          >
            {name}
          </p>
        </div>
        <div className="w-16 shrink-0 text-right">
          {isLoading ? (
            <span
              aria-label="Loading"
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-indigo-400"
              role="status"
            />
          ) : (
            <span className="text-xs tabular-nums text-gray-400">
              {formatDuration(duration)}
            </span>
          )}
        </div>
      </div>
      <button
        aria-label={`Remove ${name}`}
        className="ml-4 shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-gray-700 hover:text-gray-200"
        onClick={onRemove}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M6 18L18 6M6 6l12 12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
