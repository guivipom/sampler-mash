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
  if (samples.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No samples uploaded yet.
      </p>
    );
  }

  return (
    <ul aria-label="Uploaded samples" className="flex flex-col gap-2">
      {samples.map((sample) => (
        <li key={sample.id}>
          <SampleItem
            duration={sample.duration}
            isLoading={sample.isLoading}
            name={sample.name}
            onRemove={() => onRemove(sample.id)}
          />
        </li>
      ))}
    </ul>
  );
}
