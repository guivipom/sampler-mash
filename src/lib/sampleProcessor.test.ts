import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processForMash } from './sampleProcessor';
import type { RawAudioData } from '../types';

/** Helper to create a RawAudioData with a given duration in seconds */
function makeBuffer(durationSeconds: number, sampleRate = 44100, channels = 1): RawAudioData {
  const length = Math.floor(durationSeconds * sampleRate);
  const channelData = Array.from({ length: channels }, () => {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) data[i] = (i + 1) / length; // ascending ramp
    return data;
  });
  return { channelData, sampleRate, numberOfChannels: channels, length };
}

describe('processForMash', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('selection', () => {
    it('returns all buffers when 4 or fewer are provided', () => {
      const buffers = [makeBuffer(1), makeBuffer(1), makeBuffer(1)];
      // Prevent reversal for cleaner assertions
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      const result = processForMash(buffers);
      expect(result).toHaveLength(3);
    });

    it('returns exactly 4 buffers when more than 4 are provided', () => {
      const buffers = Array.from({ length: 7 }, () => makeBuffer(1));
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      const result = processForMash(buffers);
      expect(result).toHaveLength(4);
    });

    it('returns empty array for empty input', () => {
      const result = processForMash([]);
      expect(result).toHaveLength(0);
    });

    it('returns 1 buffer when only 1 is provided', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      const result = processForMash([makeBuffer(1)]);
      expect(result).toHaveLength(1);
    });
  });

  describe('trimming', () => {
    beforeEach(() => {
      // Disable reversal so we can test trimming in isolation
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
    });

    it('trims a buffer longer than 10 seconds to exactly 10 seconds', () => {
      const buf = makeBuffer(15, 44100);
      const [result] = processForMash([buf]);
      expect(result.length).toBe(44100 * 10);
      expect(result.channelData[0]).toHaveLength(44100 * 10);
    });

    it('does not trim a buffer of exactly 10 seconds', () => {
      const buf = makeBuffer(10, 44100);
      const [result] = processForMash([buf]);
      expect(result.length).toBe(44100 * 10);
    });

    it('does not trim a buffer shorter than 10 seconds', () => {
      const buf = makeBuffer(3, 44100);
      const [result] = processForMash([buf]);
      expect(result.length).toBe(buf.length);
      expect(result.channelData[0]).toHaveLength(buf.length);
    });

    it('preserves sample rate after trimming', () => {
      const buf = makeBuffer(15, 48000);
      const [result] = processForMash([buf]);
      expect(result.sampleRate).toBe(48000);
    });

    it('preserves channel count after trimming', () => {
      const buf = makeBuffer(15, 44100, 2);
      const [result] = processForMash([buf]);
      expect(result.numberOfChannels).toBe(2);
      expect(result.channelData).toHaveLength(2);
    });
  });

  describe('reversal', () => {
    it('reverses channel data when Math.random() < 0.5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // triggers reversal
      const buf = makeBuffer(1, 100, 1); // 100 frames, ascending ramp
      const original = buf.channelData[0].slice();
      const [result] = processForMash([buf]);
      // Reversed: last original value should now be first
      expect(result.channelData[0][0]).toBeCloseTo(original[original.length - 1]);
      expect(result.channelData[0][original.length - 1]).toBeCloseTo(original[0]);
    });

    it('does not reverse channel data when Math.random() >= 0.5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // no reversal
      const buf = makeBuffer(1, 100, 1);
      const original = buf.channelData[0].slice();
      const [result] = processForMash([buf]);
      expect(result.channelData[0][0]).toBeCloseTo(original[0]);
      expect(result.channelData[0][original.length - 1]).toBeCloseTo(original[original.length - 1]);
    });

    it('reverses all channels independently', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // triggers reversal
      const buf = makeBuffer(1, 100, 2);
      const [result] = processForMash([buf]);
      // Both channels should be reversed
      expect(result.channelData).toHaveLength(2);
      // First sample of each reversed channel should equal the last original sample
      const original = buf.channelData[0].slice();
      expect(result.channelData[0][0]).toBeCloseTo(original[original.length - 1]);
      expect(result.channelData[1][0]).toBeCloseTo(original[original.length - 1]);
    });
  });

  describe('immutability', () => {
    it('does not mutate the original buffer channel data', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // triggers reversal
      const buf = makeBuffer(1, 100, 1);
      const originalFirst = buf.channelData[0][0];
      processForMash([buf]);
      expect(buf.channelData[0][0]).toBe(originalFirst);
    });
  });
});
