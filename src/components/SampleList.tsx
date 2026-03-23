import { SampleItem } from "./SampleItem";

interface SampleListEntry {
  id: string;
  name: string;
  duration: number;
  isLoading: boolean;
}

interface SampleListProps {
  samples: SampleListEntry[];
  onRemove: (id: string) => void;
}

export function SampleList({ samples, onRemove }: SampleListProps) {
  return (
    <div>
      {/* Section header */}
      <div className="mb-2 flex items-center gap-3 text-xs uppercase tracking-widest text-orange-800">
        <span>---</span>
        <span>SAMPLE BANK</span>
        <span className="flex-1 border-t border-orange-900" />
        <span>---</span>
      </div>

      {samples.length === 0 ? (
        <p className="py-6 text-xs uppercase tracking-widest text-orange-900">
          <span>&gt; NO SAMPLES LOADED</span>
          <span className="animate-pulse">_</span>
        </p>
      ) : (
        <ul aria-label="Uploaded samples" className="flex flex-col">
          {samples.map((sample, i) => (
            <li key={sample.id}>
              <SampleItem
                index={i + 1}
                duration={sample.duration}
                isLoading={sample.isLoading}
                name={sample.name}
                onRemove={() => onRemove(sample.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
