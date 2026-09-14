/**
 * AudioWorkletProcessor for capturing heart sounds.
 * Resamples input audio to the target sample rate and buffers it before sending
 * to the main thread. Also computes the RMS amplitude for real-time visualization.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetSampleRate = options.processorOptions?.targetSampleRate || 16000;
    this.bufferSize = options.processorOptions?.bufferSize || 4096;
    
    // Calculate the ratio for resampling
    // sampleRate is a global variable available in AudioWorkletGlobalScope
    this.resampleRatio = sampleRate / this.targetSampleRate;
    
    // Initialize buffers
    this.outBuffer = new Float32Array(this.bufferSize);
    this.outBufferIndex = 0;
    
    // We need to keep track of our fractional position in the input stream
    // for linear interpolation
    this.inputOffset = 0;
  }

  process(inputs, outputs, parameters) {
    // If output channels are requested, fill with zero to keep the WebKit render pipeline pumping
    if (outputs && outputs[0] && outputs[0][0]) {
      outputs[0][0].fill(0);
    }

    const input = inputs[0];
    if (!input || !input[0]) {
      return true; // Keep alive, wait for input
    }
    
    const channel = input[0]; // Mono input
    const inputLen = channel.length; // usually 128
    
    // 1. Calculate RMS amplitude for real-time UI
    let sumSquares = 0;
    for (let i = 0; i < inputLen; i++) {
      sumSquares += channel[i] * channel[i];
    }
    const rms = Math.sqrt(sumSquares / inputLen);
    
    // Send amplitude 
    this.port.postMessage({ type: 'AMPLITUDE', value: rms });

    // 2. Resample using linear interpolation
    // We consume input samples and produce output samples
    while (this.inputOffset < inputLen) {
      // Find the integer index and fractional part
      const index = Math.floor(this.inputOffset);
      const frac = this.inputOffset - index;
      
      // Get current sample and next sample for interpolation
      const sample1 = channel[index];
      // If the next sample is outside current buffer, we just use sample1 for simplicity, 
      // or we could carry it over. For 128 samples it's acceptable.
      const sample2 = (index + 1 < inputLen) ? channel[index + 1] : sample1;
      
      // Linear interpolation
      this.outBuffer[this.outBufferIndex] = sample1 + frac * (sample2 - sample1);
      this.outBufferIndex++;
      
      // Move forward by the ratio
      this.inputOffset += this.resampleRatio;
      
      // If output buffer is full, post it and allocate a new one
      if (this.outBufferIndex >= this.bufferSize) {
        // Post using Transferable to avoid copy
        this.port.postMessage(
          { type: 'PCM_CHUNK', data: this.outBuffer, sampleRate: this.targetSampleRate },
          [this.outBuffer.buffer]
        );
        
        // Allocate fresh buffer
        this.outBuffer = new Float32Array(this.bufferSize);
        this.outBufferIndex = 0;
      }
    }
    
    // Adjust input offset for the next process call
    // We consumed inputLen samples this time
    this.inputOffset -= inputLen;
    
    return true; // Keep processor alive
  }
}

registerProcessor('heart-sound-capture-processor', AudioCaptureProcessor);
