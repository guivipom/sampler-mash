import type { RawAudioData } from '../types';

/**
 * Mixes an array of RawAudioData buffers into a single buffer where all
 * inputs start at t=0 (simultaneous layers).
 *
 * Rules:
 * - Output length = length of the longest input buffer.
 * - Shorter buffers are zero-padded for the remaining frames.
 * - If any input is stereo (numberOfChannels > 1), all mono inputs are
 *   upmixed (channel 0 duplicated to L and R) before mixing; output is stereo.
 * - If all inputs are mono, output is mono.
 * - Amplitude is the raw sum — no normalization or clamping is applied.
 *
 * Returns a new RawAudioData. Inputs are not mutated.
 */
export function renderMash(buffers: RawAudioData[]): RawAudioData {
  if (buffers.length === 0) {
    return { channelData: [], sampleRate: 0, numberOfChannels: 0, length: 0 };
  }

  const sampleRate = buffers[0].sampleRate;
  const outputLength = Math.max(...buffers.map((b) => b.length));

  // Determine output channel count: stereo if any input is stereo, else mono
  const outputChannels = buffers.some((b) => b.numberOfChannels > 1) ? 2 : 1;

  // Allocate output channel arrays
  const channelData: Float32Array[] = Array.from(
    { length: outputChannels },
    () => new Float32Array(outputLength),
  );

  for (const buf of buffers) {
    // Upmix mono to stereo if needed
    const normalized = upmixIfNeeded(buf, outputChannels);

    for (let ch = 0; ch < outputChannels; ch++) {
      const src = normalized.channelData[ch];
      const dst = channelData[ch];
      for (let i = 0; i < src.length; i++) {
        dst[i] += src[i];
      }
      // Frames beyond src.length remain 0 (zero-padded by Float32Array init)
    }
  }

  return { channelData, sampleRate, numberOfChannels: outputChannels, length: outputLength };
}

/**
 * Returns the buffer unchanged if it already has `targetChannels` channels.
 * If the buffer is mono and targetChannels is 2, duplicates channel 0 to
 * produce a stereo buffer. Inputs are not mutated.
 */
function upmixIfNeeded(buf: RawAudioData, targetChannels: number): RawAudioData {
  if (buf.numberOfChannels >= targetChannels) return buf;

  // Mono → stereo: duplicate the single channel
  const mono = buf.channelData[0];
  return {
    channelData: [mono, mono],
    sampleRate: buf.sampleRate,
    numberOfChannels: 2,
    length: buf.length,
  };
}
