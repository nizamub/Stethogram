/**
 * AudioEngine manages the complete audio pipeline for capturing heart sounds.
 * Handles microphone permissions, Web Audio API context, AudioWorklet node,
 * iOS WebKit audio keep-alives, garbage collection protections, and live playback.
 */
export class AudioEngine {
  // Private state
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private keepAliveNode: GainNode | null = null;
  private silentAudio: HTMLAudioElement | null = null;
  private wakeLock: any = null;
  
  private onPCMChunk: ((data: Float32Array) => void) | null = null;
  private onAmplitude: ((amp: number) => void) | null = null;

  private playbackEnabled = false;
  private isRunning = false;

  /**
   * Pre-initialize and synchronously unlock the AudioContext and iOS audio session
   * during a direct user touch/click event before any asynchronous operations.
   */
  initContext(): void {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      // iOS Audio Session Lock: start playing silent carrier audio synchronously
      if (!this.silentAudio) {
        this.silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        this.silentAudio.loop = true;
        this.silentAudio.play().catch(() => {});
      }

      // Pin early to window to protect against premature GC in WebKit
      (window as any).__stetho_active_context = this.audioContext;
      (window as any).__stetho_active_engine = this;
    } catch (e) {
      console.warn('[AudioEngine] initContext warning:', e);
    }
  }

  /**
   * Start capturing audio from the microphone.
   * - Requests mic with echoCancellation=false, noiseSuppression=false, autoGainControl=false
   * - Falls back to standard audio constraints if hardware/browser rejects medical constraints
   * - Sets up iOS keep-alive nodes and silent carrier to prevent Safari from killing audio
   */
  async start(
    onPCMChunk: (data: Float32Array) => void,
    onAmplitude: (amp: number) => void,
    deviceId?: string
  ): Promise<void> {
    this.onPCMChunk = onPCMChunk;
    this.onAmplitude = onAmplitude;

    // Synchronously ensure AudioContext is unlocked
    this.initContext();

    // First attempt: Medical stethoscope constraints (unfiltered raw audio)
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }
    };

    if (deviceId && typeof constraints.audio === 'object') {
      constraints.audio.deviceId = { ideal: deviceId };
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
      console.warn('[AudioEngine] Preferred audio constraints failed, falling back...', err);
      try {
        const fallback1: MediaStreamConstraints = deviceId 
          ? { audio: { deviceId: { ideal: deviceId } } }
          : { audio: true };
        this.mediaStream = await navigator.mediaDevices.getUserMedia(fallback1);
      } catch (err2: any) {
        console.warn('[AudioEngine] Fallback 1 failed, trying basic audio: true...', err2);
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    }

    // Monitor track state on iOS
    this.mediaStream.getAudioTracks().forEach(track => {
      track.onended = () => {
        console.warn('[AudioEngine] Microphone track ended unexpectedly by the OS.');
      };
      track.onmute = () => {
        console.warn('[AudioEngine] Microphone track was muted by iOS/system.');
      };
      track.onunmute = () => {
        console.log('[AudioEngine] Microphone track unmuted.');
      };
    });

    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.initContext();
    }

    // Auto-resume if iOS Safari suspends or interrupts the context
    if (this.audioContext) {
      this.audioContext.onstatechange = async () => {
        console.log('[AudioEngine] AudioContext state changed:', this.audioContext?.state);
        if (this.isRunning && (this.audioContext?.state === 'suspended' || this.audioContext?.state === 'interrupted')) {
          try {
            await this.audioContext.resume();
            console.log('[AudioEngine] Successfully resumed AudioContext.');
          } catch (e) {
            console.warn('[AudioEngine] Auto-resume failed:', e);
          }
        }
      };

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }

      await this.audioContext.audioWorklet.addModule('/worklets/audio-capture-processor.js');

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Playback gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.playbackEnabled ? 1 : 0;
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // AudioWorklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, 'heart-sound-capture-processor', {
        processorOptions: {
          targetSampleRate: 16000,
          bufferSize: 4096
        }
      });

      this.workletNode.port.onmessage = (event: MessageEvent) => {
        const { type } = event.data;
        if (type === 'PCM_CHUNK' && this.onPCMChunk) {
          this.onPCMChunk(event.data.data);
        } else if (type === 'AMPLITUDE' && this.onAmplitude) {
          this.onAmplitude(event.data.value);
        }
      };

      this.sourceNode.connect(this.workletNode);

      // 1. Keep worklet audio graph active in WebKit by routing through silent gain to destination
      this.keepAliveNode = this.audioContext.createGain();
      this.keepAliveNode.gain.value = 0.0;
      this.workletNode.connect(this.keepAliveNode);
      this.keepAliveNode.connect(this.audioContext.destination);
    }

    // 2. Prevent screen dimming on supporting mobile browsers
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch (e) {
        console.warn('[AudioEngine] Screen wakeLock warning:', e);
      }
    }

    // 3. CRITICAL: Pin all nodes to window to prevent iOS Safari Garbage Collection (WebKit Bug 172533)
    (window as any).__stetho_active_stream = this.mediaStream;
    (window as any).__stetho_active_source = this.sourceNode;
    (window as any).__stetho_active_worklet = this.workletNode;
    (window as any).__stetho_active_context = this.audioContext;
    (window as any).__stetho_active_keepalive = this.keepAliveNode;

    this.isRunning = true;
  }

  /** Stop all audio processing and release resources */
  stop(): void {
    this.isRunning = false;

    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
        this.silentAudio.src = '';
      } catch (e) {}
      this.silentAudio = null;
    }

    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }

    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.keepAliveNode) {
      this.keepAliveNode.disconnect();
      this.keepAliveNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Clear global references
    delete (window as any).__stetho_active_stream;
    delete (window as any).__stetho_active_source;
    delete (window as any).__stetho_active_worklet;
    delete (window as any).__stetho_active_context;
    delete (window as any).__stetho_active_keepalive;

    this.onPCMChunk = null;
    this.onAmplitude = null;
  }

  /** Enable live audio playback (routes mic to speakers/BT) */
  enablePlayback(): void {
    this.playbackEnabled = true;
    if (this.gainNode) {
      this.gainNode.gain.value = 1;
    }
  }

  /** Disable live audio playback (mutes output) */
  disablePlayback(): void {
    this.playbackEnabled = false;
    if (this.gainNode) {
      this.gainNode.gain.value = 0;
    }
  }

  /** Toggle or set playback state */
  setPlaybackEnabled(enabled: boolean): void {
    if (enabled) {
      this.enablePlayback();
    } else {
      this.disablePlayback();
    }
  }

  /** Check if playback is currently enabled */
  get isPlaybackEnabled(): boolean {
    return this.playbackEnabled;
  }

  /**
   * Request microphone permission explicitly to reveal hardware device labels.
   */
  static async requestPermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (e) {
      console.warn('Microphone permission request rejected:', e);
      return false;
    }
  }

  /** Get list of available audio input devices */
  static async getInputDevices(): Promise<Array<{deviceId: string, label: string, isDefault: boolean}>> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [{
        deviceId: '',
        label: 'Default Microphone',
        isDefault: true
      }];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');

      if (audioInputs.length === 0) {
        return [{
          deviceId: '',
          label: 'Default Microphone',
          isDefault: true
        }];
      }

      return audioInputs.map((device, idx) => ({
        deviceId: device.deviceId,
        label: device.label || (idx === 0 ? 'Default Microphone' : `Microphone ${idx + 1}`),
        isDefault: device.deviceId === 'default' || idx === 0
      }));
    } catch (e) {
      console.warn('Could not enumerate audio devices:', e);
      return [{
        deviceId: '',
        label: 'Default Microphone',
        isDefault: true
      }];
    }
  }

  /** Check if AudioWorklet is supported */
  static isSupported(): boolean {
    return !!(
      window.AudioContext &&
      // @ts-ignore
      AudioContext.prototype.audioWorklet
    ) || !!(
      (window as any).webkitAudioContext &&
      (window as any).webkitAudioContext.prototype.audioWorklet
    );
  }
}
