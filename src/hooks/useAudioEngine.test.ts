import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAudioEngine } from "./useAudioEngine";

// ---------------------------------------------------------------------------
// Mock Tone.js — use vi.hoisted so variables are available when vi.mock runs
// ---------------------------------------------------------------------------
const { mockDecodeAudioData, mockStart } = vi.hoisted(() => ({
  mockDecodeAudioData: vi.fn(),
  mockStart: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("tone", () => ({
  start: mockStart,
  getContext: () => ({
    decodeAudioData: mockDecodeAudioData,
  }),
}));

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

// ---------------------------------------------------------------------------
// Helper: create a File with an ArrayBuffer payload so FileReader can read it
// ---------------------------------------------------------------------------
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

  it("starts with an empty samples array", () => {
    const { result } = renderHook(() => useAudioEngine());
    expect(result.current.samples).toEqual([]);
  });

  it("immediately adds entries with isLoading=true when addFiles is called", async () => {
    const { result } = renderHook(() => useAudioEngine());

    // Don't resolve decode yet — use a deferred promise
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
    });

    // Resolve to clean up
    await act(async () => {
      resolveDecode(makeMockAudioBuffer(2.0));
    });
  });

  it("updates entry with buffer and duration after decode resolves", async () => {
    const buf = makeMockAudioBuffer(3.5);
    mockDecodeAudioData.mockResolvedValue(buf);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("snare.wav")]);
    });

    expect(result.current.samples).toHaveLength(1);
    expect(result.current.samples[0]).toMatchObject({
      name: "snare.wav",
      isLoading: false,
      buffer: buf,
      duration: 3.5,
    });
  });

  it("decodes multiple files in parallel", async () => {
    const buf1 = makeMockAudioBuffer(1.0);
    const buf2 = makeMockAudioBuffer(2.0);
    mockDecodeAudioData
      .mockResolvedValueOnce(buf1)
      .mockResolvedValueOnce(buf2);

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([
        makeAudioFile("a.wav"),
        makeAudioFile("b.wav"),
      ]);
    });

    expect(result.current.samples).toHaveLength(2);
    expect(result.current.samples.every((s) => !s.isLoading)).toBe(true);
  });

  it("removes a failed-decode entry from state", async () => {
    mockDecodeAudioData.mockRejectedValue(new Error("decode error"));

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("corrupt.wav")]);
    });

    expect(result.current.samples).toHaveLength(0);
  });

  it("keeps successful entries when one file fails to decode", async () => {
    const buf = makeMockAudioBuffer(1.0);
    mockDecodeAudioData
      .mockResolvedValueOnce(buf)
      .mockRejectedValueOnce(new Error("bad"));

    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([
        makeAudioFile("good.wav"),
        makeAudioFile("bad.wav"),
      ]);
    });

    expect(result.current.samples).toHaveLength(1);
    expect(result.current.samples[0].name).toBe("good.wav");
  });

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

    // Resolve the decode — should be a no-op since entry was removed
    await act(async () => {
      resolveDecode(makeMockAudioBuffer(1.0));
    });

    await waitFor(() => {
      // The entry was removed before decode resolved; because the setSamples
      // callback filters by id, the resolved value won't re-add it.
      expect(result.current.samples).toHaveLength(0);
    });
  });

  it("calls Tone.start() before decoding", async () => {
    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.addFiles([makeAudioFile("test.wav")]);
    });

    expect(mockStart).toHaveBeenCalled();
  });
});
