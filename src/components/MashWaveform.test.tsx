import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MashWaveform } from "./MashWaveform";

// ---------------------------------------------------------------------------
// Mock WaveSurfer so tests don't depend on a real canvas environment
// ---------------------------------------------------------------------------
const { mockWsDestroy, mockWsLoad, mockWsPlayPause, mockWsOn, MockWaveSurfer } =
  vi.hoisted(() => {
    const mockWsDestroy = vi.fn();
    const mockWsLoad = vi.fn().mockResolvedValue(undefined);
    const mockWsPlayPause = vi.fn();
    const mockWsOn = vi.fn();

    const MockWaveSurfer = {
      create: vi.fn(() => ({
        destroy: mockWsDestroy,
        load: mockWsLoad,
        playPause: mockWsPlayPause,
        on: mockWsOn,
      })),
    };

    return { mockWsDestroy, mockWsLoad, mockWsPlayPause, mockWsOn, MockWaveSurfer };
  });

vi.mock("wavesurfer.js", () => ({ default: MockWaveSurfer }));

// Mock audiobuffer-to-wav to avoid needing a real AudioBuffer
vi.mock("audiobuffer-to-wav", () => ({
  default: vi.fn(() => new ArrayBuffer(44)),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeAudioBuffer(): AudioBuffer {
  return {
    length: 4410,
    numberOfChannels: 1,
    sampleRate: 44100,
    duration: 0.1,
    getChannelData: vi.fn(() => new Float32Array(4410)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer;
}

// ---------------------------------------------------------------------------
// DOM URL mocks
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  MockWaveSurfer.create.mockClear();
  mockWsDestroy.mockClear();
  mockWsLoad.mockClear();
  mockWsPlayPause.mockClear();
  mockWsOn.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("MashWaveform", () => {
  it("shows the empty state when mashBuffer is null", () => {
    render(
      <MashWaveform mashBuffer={null} isRendering={false} onDownload={vi.fn()} />,
    );
    expect(screen.getByText(/no mash generated/i)).toBeInTheDocument();
  });

  it("does not render the waveform container or buttons when mashBuffer is null", () => {
    render(
      <MashWaveform mashBuffer={null} isRendering={false} onDownload={vi.fn()} />,
    );
    expect(screen.queryByLabelText(/waveform display/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /play mash/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download wav/i })).not.toBeInTheDocument();
  });

  it("renders the waveform container and buttons when mashBuffer is provided", () => {
    render(
      <MashWaveform mashBuffer={makeAudioBuffer()} isRendering={false} onDownload={vi.fn()} />,
    );
    expect(screen.getByLabelText(/waveform display/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play mash/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download wav/i })).toBeInTheDocument();
  });

  it("initialises WaveSurfer when mashBuffer is provided", () => {
    render(
      <MashWaveform mashBuffer={makeAudioBuffer()} isRendering={false} onDownload={vi.fn()} />,
    );
    expect(MockWaveSurfer.create).toHaveBeenCalledOnce();
    expect(mockWsLoad).toHaveBeenCalledWith("blob:mock-url");
  });

  it("calls onDownload when the download button is clicked", async () => {
    const onDownload = vi.fn();
    render(
      <MashWaveform mashBuffer={makeAudioBuffer()} isRendering={false} onDownload={onDownload} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /download wav/i }));
    expect(onDownload).toHaveBeenCalledOnce();
  });

  it("calls wavesurfer playPause when the play button is clicked", async () => {
    render(
      <MashWaveform mashBuffer={makeAudioBuffer()} isRendering={false} onDownload={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /play mash/i }));
    expect(mockWsPlayPause).toHaveBeenCalledOnce();
  });

  it("play and download buttons are disabled while rendering", () => {
    render(
      <MashWaveform mashBuffer={makeAudioBuffer()} isRendering={true} onDownload={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /play mash/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /download wav/i })).toBeDisabled();
  });

  it("destroys WaveSurfer on unmount", () => {
    const { unmount } = render(
      <MashWaveform mashBuffer={makeAudioBuffer()} isRendering={false} onDownload={vi.fn()} />,
    );
    unmount();
    expect(mockWsDestroy).toHaveBeenCalled();
  });
});
