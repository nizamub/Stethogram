import * as tf from '@tensorflow/tfjs';
import * as tflite from '@tensorflow/tfjs-tflite';
import { N_FRAMES, N_BINS } from '@/config/constants';

/**
 * ModelManager handles the complete lifecycle for the TFLite inference model.
 * Includes caching, stream downloading, loading, inference, and memory management.
 */
export class ModelManager {
  private static instance: ModelManager | null = null;
  private model: tflite.TFLiteModel | null = null;
  private isReady: boolean = false;

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  /**
   * Download and load the TFLite model.
   * 1. Initialize TF.js and configure WASM path
   * 2. Check CacheStorage first — verify buffer integrity (>50MB)
   * 3. If not cached, stream-download with progress reporting
   * 4. Cache the verified downloaded model for future offline use
   * 5. Load via @tensorflow/tfjs-tflite's loadTFLiteModel()
   * 6. Run warmup inference with zeros
   * @param modelUrl - URL to the .tflite file
   * @param onProgress - Callback with { state, percent, error? }
   */
  async load(
    modelUrl: string, 
    onProgress: (progress: { state: string; percent: number; error?: string }) => void
  ): Promise<void> {
    try {
      // 1. Initialize TF.js backend
      await tf.ready();
      console.log('[ModelManager] TF.js ready with backend:', tf.getBackend());

      // 2. Configure WASM path for TFLite runtime
      const wasmPath = window.location.origin + '/wasm/';
      if (typeof (tflite as any).setWasmPath === 'function') {
        (tflite as any).setWasmPath(wasmPath);
      } else if ((window as any).tfweb?.tflite_web_api?.setWasmPath) {
        (window as any).tfweb.tflite_web_api.setWasmPath(wasmPath);
      }

      const cacheName = 'tflite-models-cache';
      const cache = await caches.open(cacheName);
      
      let response = await cache.match(modelUrl);
      let buffer: ArrayBuffer | null = null;

      // Validate cache entry if present (must be complete 56MB model, not a partial/error page)
      if (response) {
        buffer = await response.arrayBuffer();
        if (buffer.byteLength < 50_000_000) {
          console.warn('[ModelManager] Cached model buffer incomplete (' + buffer.byteLength + ' bytes). Purging cache and re-downloading...');
          await cache.delete(modelUrl);
          response = undefined;
          buffer = null;
        } else {
          onProgress({ state: 'loading_cache', percent: 100 });
        }
      }

      if (!buffer) {
        onProgress({ state: 'downloading', percent: 0 });
        
        const fetchResponse = await fetch(modelUrl);
        if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch model: ${fetchResponse.statusText} (${fetchResponse.status})`);
        }
        
        const contentLength = fetchResponse.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 56691356;
        
        const reader = fetchResponse.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream not supported in this browser');
        }

        let received = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (total > 0) {
              onProgress({ state: 'downloading', percent: Math.min(100, Math.round((received / total) * 100)) });
            }
          }
        }

        const combined = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        buffer = combined.buffer;

        // Verify buffer size before caching
        if (buffer.byteLength > 50_000_000) {
          await cache.put(modelUrl, new Response(buffer.slice(0), {
            headers: { 'Content-Type': 'application/octet-stream' }
          }));
        } else {
          throw new Error(`Downloaded model buffer is incomplete (${buffer.byteLength} bytes received).`);
        }
      }

      onProgress({ state: 'initializing', percent: 100 });
      console.log('[ModelManager] Loading TFLite model from buffer of size:', buffer.byteLength);
      
      this.model = await tflite.loadTFLiteModel(buffer);
      console.log('[ModelManager] TFLite model loaded successfully.');
      
      // Warmup inference
      const warmupTensor = tf.zeros([1, N_FRAMES, N_BINS, 1], 'float32');
      const warmupResult = (this.model.predict(warmupTensor as any) as unknown as tf.Tensor);
      warmupResult.dispose();
      warmupTensor.dispose();

      this.isReady = true;
      onProgress({ state: 'ready', percent: 100 });
      console.log('[ModelManager] Warmup complete. Engine ready.');
    } catch (error: any) {
      console.error('[ModelManager] Failed to load model:', error);
      onProgress({ state: 'error', percent: 0, error: error.message || String(error) });
      throw error;
    }
  }

  /**
   * Run inference on a spectrogram.
   * @param spectrogramData - Flat Float32Array of shape [N_FRAMES * N_BINS]
   * @returns Float32Array of 5 class probabilities
   */
  async predict(spectrogramData: Float32Array): Promise<Float32Array> {
    if (!this.model || !this.isReady) {
      throw new Error('Model is not ready');
    }

    let tensor: tf.Tensor4D | null = null;
    let prediction: tf.Tensor | null = null;
    
    try {
      tensor = tf.tensor4d(spectrogramData, [1, N_FRAMES, N_BINS, 1], 'float32');
      prediction = (this.model.predict(tensor as any) as unknown as tf.Tensor);
      
      const probabilities = await prediction.data() as Float32Array;
      return probabilities;
    } finally {
      if (tensor) tensor.dispose();
      if (prediction) prediction.dispose();
    }
  }

  /** Dispose model and free memory */
  dispose(): void {
    if (this.model) {
      // @ts-ignore
      if (typeof this.model.dispose === 'function') {
        // @ts-ignore
        this.model.dispose();
      }
      this.model = null;
    }
    this.isReady = false;
  }

  /** Whether the model is loaded and ready */
  get ready(): boolean {
    return this.isReady;
  }
}

export const modelManager = ModelManager.getInstance();
