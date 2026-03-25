import type { RawAudioData } from '../types';
import { processForMash } from './sampleProcessor';
import { renderMash } from './mashRenderer';

/**
 * Converts a RawAudioData object to a Web Audio API AudioBuffer using the
 * provided AudioContext.
 */
export function rawAudioDataToAudioBuffer(
  raw: RawAudioData,
  ctx: BaseAudioContext,
): AudioBuffer {
  const buffer = ctx.createBuffer(raw.numberOfChannels, raw.length, raw.sampleRate);
  for (let ch = 0; ch < raw.numberOfChannels; ch++) {
    buffer.copyToChannel(raw.channelData[ch] as Float32Array<ArrayBuffer>, ch);
  }
  return buffer;
}

/**
 * Converts an array of RawAudioData (one per loaded sample) into a single
 * mixed AudioBuffer ready for playback or WAV export.
 *
 * Pipeline:
 *   1. processForMash — randomly select up to 4, trim to 10s, 50% reverse
 *   2. renderMash     — sum all selected buffers at t=0 into one RawAudioData
 *   3. Convert        — RawAudioData → AudioBuffer via the provided AudioContext
 *
 * Returns null if processForMash produces no samples (e.g., empty input).
 */
export async function createMashBuffer(
  buffers: RawAudioData[],
  ctx: BaseAudioContext,
): Promise<AudioBuffer | null> {
  const processed = processForMash(buffers);
  if (processed.length === 0) return null;

  const mixed = renderMash(processed);
  return rawAudioDataToAudioBuffer(mixed, ctx);
}
