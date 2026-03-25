import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAudioEngine } from "./useAudioEngine";

// ---------------------------------------------------------------------------
// Mock Tone.js — use vi.hoisted so variables are available when vi.mock runs
// ---------------------------------------------------------------------------
const { mockDecodeAudioData, mockStart, mockPlayerStop, mockPlayerDispose, MockPlayer } =
  vi.hoisted(() => {
    const mockPlayerStop = vi.fn();
    const mockPlayerDispose = vi.fn();
    const mockPlayerStart = vi.fn().mockReturnThis();

    // Must use a real constructor function so `new Tone.Player(...)` works
    function MockPlayer(this: Record<string, unknown>) {
      this.stop = mockPlayerStop;
      this.dispose = mockPlayerDispose;
      this.start = mockPlayerStart;
      this.toDestination = function (this: unknown) {
        return this;
      };
    }

    return {
      mockDecodeAudioData: vi.fn(),
      mockStart: vi.fn().mockResolvedValue(undefined),
      mockPlayerStop,
      mockPlayerDispose,
      MockPlayer,
    };
  });

// Mock createMashBuffer so useAudioEngine tests don't depend on the full pipeline
const { mockCreateMashBuffer } = vi.hoisted(() => ({
  mockCreateMashBuffer: vi.fn(),
}));

vi.mock("../lib/mashPlayer", () => ({
  createMashBuffer: mockCreateMashBuffer,
}));

vi.mock("tone", () => ({
  start: mockStart,
  getContext: () => ({
    decodeAudioData: mockDecodeAudioData,
    rawContext: {},
  }),
  Player: MockPlayer,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMockAudioBuffer(duration: number = 2.0): AudioBuffer {
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

function makeAudioFile(name: string = "test.wav"): File {
  return new File([new ArrayBuffer(8)], name, { type: "audio/wav" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useAudioEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecodeAudioData.mockResolvedValue(makeMockAudioBuffer(2.0));
  });

  // --- Initial state ---

  it("starts with an empty samples array", () => {
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.samples).toEqual([]);
  });

  it("starts with previewingId as null", () => {
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.previewingId).toBeNull();
  });

  // --- addFiles: loading state ---

  it("immediately adds entries with isLoading=true when addFiles is called", async () => {
    const { result } = renderHook(() => useAudioEngine());

    let resolveDecode!: (buf: AudioBuffer) => void;
    mockDecodeAudioData.mockReturnValue(
      new Promise<AudioBuffer>((res) => {
        resolveDecode = res;
      }),
    );

    act(() => {
      void result.current.addFiles([makeAudioFile("kick.wav")]);
    });

    expect(result.current.samples).toHaveLength(1);
    expect(result.current.samples[0]).toMatchObject({
      name: "kick.wav",
      isLoading: true,
      buffer: null,
      duration: 0,
      error: null,
    });

    await act(async () => {
      resolveDecode(makeMockAudioBuffer(2.0));
    });
  });

  // --- addFiles: success ---

  it("updates entry with buffer and duration after decode resolves", async () => {
    const buf = makeMockAudioBuffer(3.5);
    mockDecodeAudioData.mockResolvedValue(buf);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("snare.wav")]);
    });

    expect(result.current.samples[0]).toMatchObject({
      name: "snare.wav",
      isLoading: false,
      buffer: buf,
      duration: 3.5,
      error: null,
    });
  });

  it("decodes multiple files in parallel", async () => {
    mockDecodeAudioData
      .mockResolvedValueOnce(makeMockAudioBuffer(1.0))
      .mockResolvedValueOnce(makeMockAudioBuffer(2.0));

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([
        makeAudioFile("a.wav"),
        makeAudioFile("b.wav"),
      ]);
    });

    expect(result.current.samples).toHaveLength(2);
    expect(result.current.samples.every((s) => !s.isLoading)).toBe(true);
    expect(result.current.samples.every((s) => s.error === null)).toBe(true);
  });

  it("calls Tone.start() before decoding", async () => {
    const { result } = renderHook(() => useAudioEngine());
    await act(async () => {
      await result.current.addFiles([makeAudioFile("test.wav")]);
    });
    expect(mockStart).toHaveBeenCalled();
  });

  // --- addFiles: error handling ---

  it("marks a failed-decode entry with an error string", async () => {
    mockDecodeAudioData.mockRejectedValue(new Error("decode error"));

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("corrupt.wav")]);
    });

    expect(result.current.samples).toHaveLength(1);
    expect(result.current.samples[0]).toMatchObject({
      name: "corrupt.wav",
      isLoading: false,
      buffer: null,
      error: "DECODE FAILED",
    });
  });

  it("keeps successful entries when one file fails to decode", async () => {
    mockDecodeAudioData
      .mockResolvedValueOnce(makeMockAudioBuffer(1.0))
      .mockRejectedValueOnce(new Error("bad"));

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([
        makeAudioFile("good.wav"),
        makeAudioFile("bad.wav"),
      ]);
    });

    expect(result.current.samples).toHaveLength(2);
    expect(result.current.samples[0]).toMatchObject({
      name: "good.wav",
      error: null,
    });
    expect(result.current.samples[1]).toMatchObject({
      name: "bad.wav",
      error: "DECODE FAILED",
    });
  });

  // --- removeSample ---

  it("removeSample removes the correct sample by id", async () => {
    mockDecodeAudioData
      .mockResolvedValueOnce(makeMockAudioBuffer(1.0))
      .mockResolvedValueOnce(makeMockAudioBuffer(2.0));

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([
        makeAudioFile("a.wav"),
        makeAudioFile("b.wav"),
      ]);
    });

    const idToRemove = result.current.samples[0].id;

    act(() => {
      result.current.removeSample(idToRemove);
    });

    expect(result.current.samples).toHaveLength(1);
    expect(result.current.samples[0].name).toBe("b.wav");
  });

  it("removeSample during loading removes the pending entry", async () => {
    let resolveDecode!: (buf: AudioBuffer) => void;
    mockDecodeAudioData.mockReturnValue(
      new Promise<AudioBuffer>((res) => {
        resolveDecode = res;
      }),
    );

    const { result } = renderHook(() => useAudioEngine());

    act(() => {
      void result.current.addFiles([makeAudioFile("pending.wav")]);
    });

    const pendingId = result.current.samples[0].id;

    act(() => {
      result.current.removeSample(pendingId);
    });

    expect(result.current.samples).toHaveLength(0);

    await act(async () => {
      resolveDecode(makeMockAudioBuffer(1.0));
    });

    await waitFor(() => {
      expect(result.current.samples).toHaveLength(0);
    });
  });

  // --- previewSample ---

  it("sets previewingId when previewSample is called", async () => {
    const buf = makeMockAudioBuffer(1.0);
    mockDecodeAudioData.mockResolvedValue(buf);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("kick.wav")]);
    });

    const id = result.current.samples[0].id;

    act(() => {
      result.current.previewSample(id);
    });

    // previewingId is set to the sample's id
    expect(result.current.previewingId).toBe(id);
  });

  it("does nothing when previewSample is called for a sample with no buffer", async () => {
    mockDecodeAudioData.mockRejectedValue(new Error("bad"));

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("broken.wav")]);
    });

    const id = result.current.samples[0].id;

    act(() => {
      result.current.previewSample(id);
    });

    // Buffer is null (error state) so previewingId stays null
    expect(result.current.previewingId).toBeNull();
  });

  // --- stopPreview ---

  it("stopPreview clears previewingId", async () => {
    const buf = makeMockAudioBuffer(1.0);
    mockDecodeAudioData.mockResolvedValue(buf);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("kick.wav")]);
    });

    const id = result.current.samples[0].id;

    act(() => {
      result.current.previewSample(id);
    });

    expect(result.current.previewingId).toBe(id);

    act(() => {
      result.current.stopPreview();
    });

    expect(result.current.previewingId).toBeNull();
    // The underlying Tone.Player's stop method should have been called
    expect(mockPlayerStop).toHaveBeenCalled();
  });

  // --- playMash ---

  it("starts with isRendering=false and mashBuffer=null", () => {
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.isRendering).toBe(false);
    expect(result.current.mashBuffer).toBeNull();
  });

  it("playMash does nothing when there are no ready samples", async () => {
    const { result } = renderHook(() => useAudioEngine());
    await act(async () => {
      await result.current.playMash();
    });
    expect(mockCreateMashBuffer).not.toHaveBeenCalled();
  });

  it("playMash sets isRendering to false after completion", async () => {
    const buf = makeMockAudioBuffer(2.0);
    mockDecodeAudioData.mockResolvedValue(buf);
    mockCreateMashBuffer.mockResolvedValue(buf);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("kick.wav")]);
    });

    await act(async () => {
      await result.current.playMash();
    });

    expect(result.current.isRendering).toBe(false);
  });

  it("playMash caches the rendered AudioBuffer in mashBuffer", async () => {
    const buf = makeMockAudioBuffer(2.0);
    mockDecodeAudioData.mockResolvedValue(buf);
    mockCreateMashBuffer.mockResolvedValue(buf);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("kick.wav")]);
    });

    await act(async () => {
      await result.current.playMash();
    });

    expect(result.current.mashBuffer).toBe(buf);
  });

  it("mashBuffer is invalidated when a sample is added", async () => {
    const buf = makeMockAudioBuffer(2.0);
    mockDecodeAudioData.mockResolvedValue(buf);
    mockCreateMashBuffer.mockResolvedValue(buf);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("kick.wav")]);
    });

    await act(async () => {
      await result.current.playMash();
    });

    expect(result.current.mashBuffer).toBe(buf);

    await act(async () => {
      await result.current.addFiles([makeAudioFile("snare.wav")]);
    });

    expect(result.current.mashBuffer).toBeNull();
  });

  it("mashBuffer is invalidated when a sample is removed", async () => {
    const buf = makeMockAudioBuffer(2.0);
    mockDecodeAudioData.mockResolvedValue(buf);
    mockCreateMashBuffer.mockResolvedValue(buf);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("kick.wav")]);
    });

    await act(async () => {
      await result.current.playMash();
    });

    const id = result.current.samples[0].id;

    act(() => {
      result.current.removeSample(id);
    });

    expect(result.current.mashBuffer).toBeNull();
  });

  it("removeSample stops preview when removing the previewing sample", async () => {
    const buf = makeMockAudioBuffer(1.0);
    mockDecodeAudioData.mockResolvedValue(buf);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("kick.wav")]);
    });

    const id = result.current.samples[0].id;

    act(() => {
      result.current.previewSample(id);
    });

    expect(result.current.previewingId).toBe(id);

    act(() => {
      result.current.removeSample(id);
    });

    expect(result.current.previewingId).toBeNull();
    expect(result.current.samples).toHaveLength(0);
    // The underlying Tone.Player's dispose method should have been called
    expect(mockPlayerDispose).toHaveBeenCalled();
  });
});
