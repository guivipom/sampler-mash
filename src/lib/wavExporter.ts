import audioBufferToWav from 'audiobuffer-to-wav';

/**
 * Converts an AudioBuffer to a WAV file and triggers a browser download.
 *
 * Steps:
 *   1. Encode the AudioBuffer as a WAV ArrayBuffer via `audiobuffer-to-wav`
 *   2. Wrap the result in a Blob with the correct MIME type
 *   3. Create an object URL, attach it to a temporary <a> element, and click it
 *   4. Revoke the object URL to release memory
 *
 * @param buffer   The AudioBuffer to export.
 * @param filename The filename for the downloaded file (defaults to "mash.wav").
 */
export function exportWav(buffer: AudioBuffer, filename = 'mash.wav'): void {
  const wavArrayBuffer = audioBufferToWav(buffer);
  const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
