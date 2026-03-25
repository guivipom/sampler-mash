interface MashControlsProps {
  hasReadySamples: boolean;
  isRendering: boolean;
  onGenerate: () => void;
}

export function MashControls({
  hasReadySamples,
  isRendering,
  onGenerate,
}: MashControlsProps) {
  const disabled = !hasReadySamples || isRendering;

  return (
    <div className="border border-orange-900 px-4 py-3">
      <div className="mb-2 text-xs uppercase tracking-widest text-orange-800">
        --- MASH ENGINE ---
      </div>
      <div className="flex items-center gap-4">
        <button
          aria-label="Generate mash"
          className="border border-orange-700 bg-black px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-400 transition-colors hover:border-orange-500 hover:bg-orange-950 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-orange-900 disabled:text-orange-800"
          disabled={disabled}
          onClick={onGenerate}
          type="button"
        >
          [ GENERATE MASH ]
        </button>

        {isRendering && (
          <span
            aria-live="polite"
            className="animate-pulse text-xs uppercase tracking-widest text-orange-500"
          >
            [RENDERING...]
          </span>
        )}
      </div>
    </div>
  );
}
