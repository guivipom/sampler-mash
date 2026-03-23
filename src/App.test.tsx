import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";

// ---------------------------------------------------------------------------
// Mock Tone.js — use vi.hoisted so variables are available when vi.mock runs
// ---------------------------------------------------------------------------
const { mockDecodeAudioData } = vi.hoisted(() => ({
  mockDecodeAudioData: vi.fn(),
}));

vi.mock("tone", () => ({
  start: vi.fn().mockResolvedValue(undefined),
  getContext: () => ({ decodeAudioData: mockDecodeAudioData }),
}));

function makeMockAudioBuffer(duration: number = 1.0): AudioBuffer {
  return {
    duration,
    length: duration * 44100,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: vi.fn(),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer;
}

function makeAudioFile(name: string): File {
  return new File([new ArrayBuffer(8)], name, { type: "audio/wav" });
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecodeAudioData.mockResolvedValue(makeMockAudioBuffer(1.0));
  });

  it("renders the app heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /sampler app/i }),
    ).toBeInTheDocument();
  });

  it("renders the upload button", () => {
    render(<App />);
    expect(screen.getByText("Add Samples (0/25)")).toBeInTheDocument();
  });

  it("renders the empty sample list message initially", () => {
    render(<App />);
    expect(screen.getByText(/no samples uploaded yet/i)).toBeInTheDocument();
  });

  it("adds samples to the list after file selection", async () => {
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      await userEvent.upload(input, [
        makeAudioFile("kick.wav"),
        makeAudioFile("snare.wav"),
      ]);
    });

    await screen.findByText("kick.wav");
    expect(screen.getByText("snare.wav")).toBeInTheDocument();
    expect(screen.queryByText(/no samples uploaded yet/i)).not.toBeInTheDocument();
  });

  it("shows a rejection message when selection would exceed the cap", async () => {
    // Pre-fill to 24 samples
    const manyFiles = Array.from({ length: 24 }, (_, i) =>
      makeAudioFile(`sample-${i}.wav`),
    );
    mockDecodeAudioData.mockResolvedValue(makeMockAudioBuffer(1.0));

    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      await userEvent.upload(input, manyFiles);
    });

    // Now try to add 2 more (only 1 slot left)
    await act(async () => {
      await userEvent.upload(input, [
        makeAudioFile("overflow-a.wav"),
        makeAudioFile("overflow-b.wav"),
      ]);
    });

    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/only 1 slot remaining/i);
  });

  it("dismisses the rejection message when the dismiss button is clicked", async () => {
    // Pre-fill to 24 samples to trigger a rejection
    const manyFiles = Array.from({ length: 24 }, (_, i) =>
      makeAudioFile(`sample-${i}.wav`),
    );
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      await userEvent.upload(input, manyFiles);
    });

    await act(async () => {
      await userEvent.upload(input, [
        makeAudioFile("over-a.wav"),
        makeAudioFile("over-b.wav"),
      ]);
    });

    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: /dismiss error/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("removes a sample when its remove button is clicked", async () => {
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      await userEvent.upload(input, [makeAudioFile("removable.wav")]);
    });

    await screen.findByText("removable.wav");
    await userEvent.click(
      screen.getByRole("button", { name: /remove removable\.wav/i }),
    );

    expect(screen.queryByText("removable.wav")).not.toBeInTheDocument();
    expect(screen.getByText(/no samples uploaded yet/i)).toBeInTheDocument();
  });

  it("updates the sample count display as samples are added", async () => {
    render(<App />);

    expect(screen.getByText("Add Samples (0/25)")).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      await userEvent.upload(input, [makeAudioFile("beat.wav")]);
    });

    await screen.findByText("Add Samples (1/25)");
    expect(screen.getByText("1/25 samples")).toBeInTheDocument();
  });
});
