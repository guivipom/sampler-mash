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
      screen.getByRole("heading", { name: /sampler.*mash system/i }),
    ).toBeInTheDocument();
  });

  it("renders the upload button", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /load samples, 0 of 25 used/i }),
    ).toHaveTextContent(/LOAD SAMPLES\s+00\/25/);
  });

  it("renders the SAMPLE BANK section header", () => {
    render(<App />);
    expect(screen.getByText("SAMPLE BANK")).toBeInTheDocument();
  });

  it("renders the empty state message initially", () => {
    render(<App />);
    expect(screen.getByText(/no samples loaded/i)).toBeInTheDocument();
  });

  it("adds samples to the list after file selection", async () => {
    render(<App />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      await userEvent.upload(input, [
        makeAudioFile("kick.wav"),
        makeAudioFile("snare.wav"),
      ]);
    });

    await screen.findByText("kick.wav");
    expect(screen.getByText("snare.wav")).toBeInTheDocument();
    expect(screen.queryByText(/no samples loaded/i)).not.toBeInTheDocument();
  });

  it("shows a rejection warning when selection would exceed the cap", async () => {
    const manyFiles = Array.from({ length: 24 }, (_, i) =>
      makeAudioFile(`sample-${i}.wav`),
    );
    render(<App />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await act(async () => {
      await userEvent.upload(input, manyFiles);
    });

    await act(async () => {
      await userEvent.upload(input, [
        makeAudioFile("overflow-a.wav"),
        makeAudioFile("overflow-b.wav"),
      ]);
    });

    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/only 1 slot remaining/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/\[!\] warning/i);
  });

  it("dismisses the rejection message when the dismiss button is clicked", async () => {
    const manyFiles = Array.from({ length: 24 }, (_, i) =>
      makeAudioFile(`sample-${i}.wav`),
    );
    render(<App />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

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
    await userEvent.click(
      screen.getByRole("button", { name: /dismiss error/i }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("removes a sample when its remove button is clicked", async () => {
    render(<App />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      await userEvent.upload(input, [makeAudioFile("removable.wav")]);
    });

    await screen.findByText("removable.wav");
    await userEvent.click(
      screen.getByRole("button", { name: /remove removable\.wav/i }),
    );

    expect(screen.queryByText("removable.wav")).not.toBeInTheDocument();
    expect(screen.getByText(/no samples loaded/i)).toBeInTheDocument();
  });

  it("updates the sample count display as samples are added", async () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /load samples, 0 of 25 used/i }),
    ).toHaveTextContent(/LOAD SAMPLES\s+00\/25/);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      await userEvent.upload(input, [makeAudioFile("beat.wav")]);
    });

    await screen.findByRole("button", { name: /load samples, 1 of 25 used/i });
    // The count span renders count/max as separate text nodes; use regex to match
    expect(screen.getByText(/LOADED/)).toBeInTheDocument();
  });
});
