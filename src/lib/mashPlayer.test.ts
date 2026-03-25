import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMashBuffer, rawAudioDataToAudioBuffer } from './mashPlayer';
import type { RawAudioData } from '../types';

// ---------------------------------------------------------------------------
// Mock sampleProcessor and mashRenderer so mashPlayer tests stay isolated
// ---------------------------------------------------------------------------
vi.mock('./sampleProcessor', () => ({
  processForMash: vi.fn((buffers: RawAudioData[]) => buffers),
}));

vi.mock('./mashRenderer', () => ({
  renderMash: vi.fn((buffers: RawAudioData[]) => buffers[0]),
}));

import { processForMash } from './sampleProcessor';
import { renderMash } from './mashRenderer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRaw(length: number, channels = 1, sampleRate = 44100): RawAudioData {
  return {
    channelData: Array.from({ length: channels }, () => new Float32Array(length).fill(0.5)),
    sampleRate,
    numberOfChannels: channels,
    length,
  };
}

function makeAudioContext(length: number, channels = 1, sampleRate = 44100): BaseAudioContext {
  const mockBuffer = {
    length,
    numberOfChannels: channels,
    sampleRate,
    duration: length / sampleRate,
    copyToChannel: vi.fn(),
    getChannelData: vi.fn(),
    copyFromChannel: vi.fn(),
  } as unknown as AudioBuffer;

  return {
    createBuffer: vi.fn().mockReturnValue(mockBuffer),
  } as unknown as BaseAudioContext;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('rawAudioDataToAudioBuffer', () => {
  it('calls createBuffer with correct parameters', () => {
    const raw = makeRaw(4410, 2, 44100);
    const ctx = makeAudioContext(4410, 2, 44100);
    rawAudioDataToAudioBuffer(raw, ctx);
    expect(ctx.createBuffer).toHaveBeenCalledWith(2, 4410, 44100);
  });

  it('copies each channel to the AudioBuffer', () => {
    const raw = makeRaw(100, 2, 44100);
    const ctx = makeAudioContext(100, 2, 44100);
    const buf = rawAudioDataToAudioBuffer(raw, ctx);
    expect(buf.copyToChannel).toHaveBeenCalledTimes(2);
    expect(buf.copyToChannel).toHaveBeenCalledWith(raw.channelData[0], 0);
    expect(buf.copyToChannel).toHaveBeenCalledWith(raw.channelData[1], 1);
  });
});

describe('createMashBuffer', () => {
  beforeEach(() => {
    vi.mocked(processForMash).mockImplementation((buffers) => buffers);
    vi.mocked(renderMash).mockImplementation((buffers) => buffers[0]);
  });

  it('returns null when processForMash produces no samples', async () => {
    vi.mocked(processForMash).mockReturnValue([]);
    const ctx = makeAudioContext(0);
    const result = await createMashBuffer([makeRaw(100)], ctx);
    expect(result).toBeNull();
  });

  it('calls processForMash with the provided buffers', async () => {
    const buffers = [makeRaw(100)];
    const ctx = makeAudioContext(100);
    await createMashBuffer(buffers, ctx);
    expect(processForMash).toHaveBeenCalledWith(buffers);
  });

  it('calls renderMash with the result of processForMash', async () => {
    const raw = makeRaw(100);
    const processed = [raw];
    vi.mocked(processForMash).mockReturnValue(processed);
    const ctx = makeAudioContext(100);
    await createMashBuffer([raw], ctx);
    expect(renderMash).toHaveBeenCalledWith(processed);
  });

  it('returns an AudioBuffer with the correct length and sample rate', async () => {
    const raw = makeRaw(4410, 1, 44100);
    vi.mocked(processForMash).mockReturnValue([raw]);
    vi.mocked(renderMash).mockReturnValue(raw);
    const ctx = makeAudioContext(4410, 1, 44100);
    const result = await createMashBuffer([raw], ctx);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(4410);
    expect(result!.sampleRate).toBe(44100);
  });
});
