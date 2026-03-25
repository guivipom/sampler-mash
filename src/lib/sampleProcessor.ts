import type { RawAudioData } from '../types';

const MAX_DURATION_SECONDS = 10;
const MAX_SAMPLES = 4;

/**
 * Randomly selects up to 4 samples from the input, trims any sample longer
 * than 10 seconds to exactly 10 seconds, and reverses each sample's channel
 * data with a 50% probability.
 *
 * Returns copies of the processed RawAudioData — inputs are not mutated.
 */
export function processForMash(buffers: RawAudioData[]): RawAudioData[] {
  if (buffers.length === 0) return [];

  // Randomly select up to MAX_SAMPLES from the input
  const selected = selectRandom(buffers, MAX_SAMPLES);

  return selected.map((buf) => {
    // Trim to 10 seconds max
    const maxFrames = buf.sampleRate * MAX_DURATION_SECONDS;
    const trimmedLength = Math.min(buf.length, maxFrames);

    // Copy (and optionally trim) each channel
    let channelData = buf.channelData.map((ch) => ch.slice(0, trimmedLength));

    // Reverse with 50% probability
    if (Math.random() < 0.5) {
      channelData = channelData.map((ch) => {
        const reversed = new Float32Array(ch.length);
        for (let i = 0; i < ch.length; i++) {
          reversed[i] = ch[ch.length - 1 - i];
        }
        return reversed;
      });
    }

    return {
      channelData,
      sampleRate: buf.sampleRate,
      numberOfChannels: buf.numberOfChannels,
      length: trimmedLength,
    };
  });
}

/**
 * Returns a random subset of `arr` with at most `n` elements,
 * using a Fisher-Yates partial shuffle.
 */
function selectRandom<T>(arr: T[], n: number): T[] {
  const copy = arr.slice();
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
