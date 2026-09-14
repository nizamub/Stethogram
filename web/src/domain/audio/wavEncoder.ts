/**
 * Encodes Float32Array audio samples to a 16-bit PCM WAV Blob.
 * @param samples The audio samples in Float32 format (-1.0 to 1.0).
 * @param sampleRate The sample rate of the audio (e.g., 44100).
 * @param numChannels The number of audio channels (defaults to 1 for mono).
 * @returns A Blob containing the encoded WAV data.
 */
export function encodeWAV(samples: Float32Array, sampleRate: number, numChannels: number = 1): Blob {
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write strings to the DataView
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // Chunk size
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Write audio data as 16-bit signed PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let sample = Math.max(-1, Math.min(1, samples[i]));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, sample, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Triggers a download of a WAV Blob in the browser.
 * @param blob The WAV file Blob.
 * @param filename The desired filename for the download.
 */
export function downloadWAV(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  
  document.body.appendChild(anchor);
  anchor.click();
  
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
