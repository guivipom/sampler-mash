import { describe, it, expect } from 'vitest';
import { renderMash } from './mashRenderer';
import type { RawAudioData } from '../types';

/** Helper to build a RawAudioData with constant value `fill` in each channel */
function makeBuffer(
  length: number,
  fill: number,
  channels = 1,
  sampleRate = 44100,
): RawAudioData {
  const channelData = Array.from(
    { length: channels },
    () => new Float32Array(length).fill(fill),
  );
  return { channelData, sampleRate, numberOfChannels: channels, length };
}

describe('renderMash', () => {
  describe('empty input', () => {
    it('returns a zero-length RawAudioData for empty input', () => {
      const result = renderMash([]);
      expect(result.length).toBe(0);
      expect(result.numberOfChannels).toBe(0);
      expect(result.channelData).toHaveLength(0);
    });
  });

  describe('single buffer passthrough', () => {
    it('returns equivalent data when given a single mono buffer', () => {
      const buf = makeBuffer(100, 0.5, 1);
      const result = renderMash([buf]);
      expect(result.length).toBe(100);
      expect(result.numberOfChannels).toBe(1);
      expect(result.sampleRate).toBe(44100);
      expect(result.channelData[0][0]).toBeCloseTo(0.5);
    });

    it('returns equivalent data when given a single stereo buffer', () => {
      const buf = makeBuffer(100, 0.3, 2);
      const result = renderMash([buf]);
      expect(result.numberOfChannels).toBe(2);
      expect(result.channelData[0][0]).toBeCloseTo(0.3);
      expect(result.channelData[1][0]).toBeCloseTo(0.3);
    });
  });

  describe('summing', () => {
    it('sums two equal-length mono buffers sample-by-sample', () => {
      const a = makeBuffer(4, 0.25, 1);
      const b = makeBuffer(4, 0.5, 1);
      const result = renderMash([a, b]);
      expect(result.length).toBe(4);
      for (let i = 0; i < 4; i++) {
        expect(result.channelData[0][i]).toBeCloseTo(0.75);
      }
    });

    it('sums two equal-length stereo buffers sample-by-sample', () => {
      const a = makeBuffer(4, 0.1, 2);
      const b = makeBuffer(4, 0.2, 2);
      const result = renderMash([a, b]);
      expect(result.numberOfChannels).toBe(2);
      for (let i = 0; i < 4; i++) {
        expect(result.channelData[0][i]).toBeCloseTo(0.3);
        expect(result.channelData[1][i]).toBeCloseTo(0.3);
      }
    });

    it('does not clamp values — raw sum is preserved', () => {
      const a = makeBuffer(4, 0.9, 1);
      const b = makeBuffer(4, 0.8, 1);
      const result = renderMash([a, b]);
      // 0.9 + 0.8 = 1.7, exceeds [-1,1] but must not be clamped
      expect(result.channelData[0][0]).toBeCloseTo(1.7);
    });
  });

  describe('zero-padding', () => {
    it('output length equals the longest input buffer', () => {
      const short = makeBuffer(50, 1.0, 1);
      const long = makeBuffer(200, 0.5, 1);
      const result = renderMash([short, long]);
      expect(result.length).toBe(200);
    });

    it('frames beyond the shorter buffer are the longer buffer\'s values (zero-padded short)', () => {
      const short = makeBuffer(2, 1.0, 1);
      const long = makeBuffer(6, 0.3, 1);
      const result = renderMash([short, long]);
      // Frames 0–1: 1.0 + 0.3 = 1.3
      expect(result.channelData[0][0]).toBeCloseTo(1.3);
      expect(result.channelData[0][1]).toBeCloseTo(1.3);
      // Frames 2–5: 0 + 0.3 = 0.3
      expect(result.channelData[0][2]).toBeCloseTo(0.3);
      expect(result.channelData[0][5]).toBeCloseTo(0.3);
    });
  });

  describe('channel handling', () => {
    it('mono + mono produces mono output', () => {
      const a = makeBuffer(4, 0.1, 1);
      const b = makeBuffer(4, 0.2, 1);
      const result = renderMash([a, b]);
      expect(result.numberOfChannels).toBe(1);
      expect(result.channelData).toHaveLength(1);
    });

    it('stereo + stereo produces stereo output', () => {
      const a = makeBuffer(4, 0.1, 2);
      const b = makeBuffer(4, 0.2, 2);
      const result = renderMash([a, b]);
      expect(result.numberOfChannels).toBe(2);
      expect(result.channelData).toHaveLength(2);
    });

    it('mono + stereo produces stereo output (mono upmixed)', () => {
      const mono = makeBuffer(4, 0.5, 1);
      const stereo = makeBuffer(4, 0.25, 2);
      const result = renderMash([mono, stereo]);
      expect(result.numberOfChannels).toBe(2);
      expect(result.channelData).toHaveLength(2);
      // Mono (0.5 on both L and R after upmix) + stereo (0.25) = 0.75 each
      expect(result.channelData[0][0]).toBeCloseTo(0.75);
      expect(result.channelData[1][0]).toBeCloseTo(0.75);
    });
  });

  describe('immutability', () => {
    it('does not mutate input buffers', () => {
      const a = makeBuffer(4, 0.5, 1);
      const b = makeBuffer(4, 0.5, 1);
      const originalA0 = a.channelData[0][0];
      renderMash([a, b]);
      expect(a.channelData[0][0]).toBe(originalA0);
    });
  });
});
