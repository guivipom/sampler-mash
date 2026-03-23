export interface Sample {
  id: string;
  name: string;
  buffer: AudioBuffer;
  duration: number;
}

export interface Chunk {
  sampleId: string;
  index: number;
  buffer: AudioBuffer;
}

export interface RawAudioData {
  channelData: Float32Array[];
  sampleRate: number;
  numberOfChannels: number;
  length: number;
}
