import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportWav } from './wavExporter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal AudioBuffer-shaped object that satisfies audiobuffer-to-wav.
 * The library reads numberOfChannels, sampleRate, and calls getChannelData(ch).
 */
function makeAudioBuffer(
  length: number,
  channels: number,
  sampleRate: number,
): AudioBuffer {
  const channelData = Array.from(
    { length: channels },
    () => new Float32Array(length).fill(0),
  );
  return {
    length,
    numberOfChannels: channels,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: (ch: number) => channelData[ch],
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer;
}

/**
 * Reads a WAV header field from an ArrayBuffer.
 * The RIFF/WAVE header is 44 bytes:
 *   offset 22 (uint16le): number of channels
 *   offset 24 (uint32le): sample rate
 *   offset 34 (uint16le): bits per sample
 */
function readWavHeader(arrayBuffer: ArrayBuffer) {
  const view = new DataView(arrayBuffer);
  return {
    numChannels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    bitDepth: view.getUint16(34, true),
  };
}

// ---------------------------------------------------------------------------
// DOM mocks
// ---------------------------------------------------------------------------

let mockAnchor: {
  href: string;
  download: string;
  click: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  mockAnchor = { href: '', download: '', click: vi.fn() };

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return mockAnchor as unknown as HTMLElement;
    throw new Error(`Unexpected createElement call: ${tag}`);
  });

  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('exportWav', () => {
  it('produces a Blob with audio/wav MIME type', async () => {
    const capturedBlobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      capturedBlobs.push(blob as Blob);
      return 'blob:mock-url';
    });

    const buffer = makeAudioBuffer(4410, 1, 44100);
    exportWav(buffer);

    expect(capturedBlobs).toHaveLength(1);
    expect(capturedBlobs[0].type).toBe('audio/wav');
  });

  it('WAV header contains correct sample rate, bit depth, and channel count (mono)', async () => {
    const capturedBlobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      capturedBlobs.push(blob as Blob);
      return 'blob:mock-url';
    });

    const buffer = makeAudioBuffer(44100, 1, 44100);
    exportWav(buffer);

    expect(capturedBlobs).toHaveLength(1);
    const arrayBuffer = await capturedBlobs[0].arrayBuffer();
    const header = readWavHeader(arrayBuffer);

    expect(header.numChannels).toBe(1);
    expect(header.sampleRate).toBe(44100);
    expect(header.bitDepth).toBe(16); // audiobuffer-to-wav defaults to 16-bit PCM
  });

  it('WAV header contains correct channel count for stereo buffers', async () => {
    const capturedBlobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      capturedBlobs.push(blob as Blob);
      return 'blob:mock-url';
    });

    const buffer = makeAudioBuffer(44100, 2, 44100);
    exportWav(buffer);

    expect(capturedBlobs).toHaveLength(1);
    const arrayBuffer = await capturedBlobs[0].arrayBuffer();
    const header = readWavHeader(arrayBuffer);

    expect(header.numChannels).toBe(2);
    expect(header.sampleRate).toBe(44100);
    expect(header.bitDepth).toBe(16);
  });

  it('triggers a download by clicking an <a> element with the correct filename', () => {
    const buffer = makeAudioBuffer(4410, 1, 44100);
    exportWav(buffer, 'my-mash.wav');

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.download).toBe('my-mash.wav');
    expect(mockAnchor.click).toHaveBeenCalledOnce();
  });

  it('uses "mash.wav" as the default filename', () => {
    const buffer = makeAudioBuffer(4410, 1, 44100);
    exportWav(buffer);

    expect(mockAnchor.download).toBe('mash.wav');
  });

  it('revokes the object URL after triggering the download', () => {
    const buffer = makeAudioBuffer(4410, 1, 44100);
    exportWav(buffer);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
