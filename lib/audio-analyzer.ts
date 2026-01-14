/**
 * Audio Analyzer - Voice Intonation Analysis using Web Audio API
 * 
 * Analyzes:
 * - Volume/Loudness (RMS)
 * - Pitch variation detection
 * - Speaking pace (silence detection)
 */

export interface VoiceAnalysisResult {
  averageVolume: number;      // 0-100
  volumeVariation: number;    // Standard deviation, higher = more expressive
  silencePercentage: number;  // % of time in silence
  peakVolume: number;         // Max volume reached
  volumeConsistency: string;  // "too-quiet" | "too-loud" | "good" | "inconsistent"
}

export interface VoiceMetrics {
  currentVolume: number;      // Real-time volume 0-100
  isActive: boolean;          // Is speaking (not silence)
}

type MetricsCallback = (metrics: VoiceMetrics) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  
  // Tracking data
  private volumeSamples: number[] = [];
  private silentFrames: number = 0;
  private totalFrames: number = 0;
  private isRunning: boolean = false;
  private animationId: number | null = null;
  
  private onMetricsUpdate: MetricsCallback | null = null;
  
  // Thresholds
  private SILENCE_THRESHOLD = 5;  // Lower threshold for better sensitivity
  
  async start(onUpdate?: MetricsCallback): Promise<boolean> {
    try {
      console.log("[AudioAnalyzer] Starting...");
      
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false,  // Disable for more accurate volume
          noiseSuppression: false,  // Disable for more accurate volume
          autoGainControl: false    // Disable to measure actual volume
        } 
      });
      
      console.log("[AudioAnalyzer] Got media stream");
      
      // Create audio context
      this.audioContext = new AudioContext();
      
      // Resume audio context if suspended (required for user gesture)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
        console.log("[AudioAnalyzer] Resumed AudioContext");
      }
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;  // Larger for better resolution
      this.analyser.smoothingTimeConstant = 0.3;  // Less smoothing for faster response
      
      // Connect stream to analyser
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.source.connect(this.analyser);
      
      // Create data array for time domain data
      const bufferLength = this.analyser.fftSize;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Set callback
      this.onMetricsUpdate = onUpdate || null;
      
      // Reset tracking
      this.volumeSamples = [];
      this.silentFrames = 0;
      this.totalFrames = 0;
      
      // Start analysis loop
      this.isRunning = true;
      this.analyze();
      
      console.log("[AudioAnalyzer] Started successfully");
      return true;
    } catch (error) {
      console.error("[AudioAnalyzer] Start error:", error);
      return false;
    }
  }
  
  private analyze = (): void => {
    const analyser = this.analyser;
    const dataArray = this.dataArray;
    
    if (!this.isRunning || !analyser || !dataArray) {
      return;
    }
    
    // Get time domain data for volume analysis
    analyser.getByteTimeDomainData(dataArray);
    
    // Calculate RMS (Root Mean Square) for volume
    let sum = 0;
    let max = 0;
    for (let i = 0; i < dataArray.length; i++) {
      // Convert from 0-255 to -1 to 1
      const amplitude = (dataArray[i] - 128) / 128;
      sum += amplitude * amplitude;
      max = Math.max(max, Math.abs(amplitude));
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Convert to 0-100 scale with better sensitivity
    // RMS typically ranges from 0 to ~0.5 for normal speech
    const volume = Math.min(100, Math.round(rms * 1300));
    
    // Track metrics
    this.volumeSamples.push(volume);
    this.totalFrames++;
    
    if (volume < this.SILENCE_THRESHOLD) {
      this.silentFrames++;
    }
    
    // Send real-time update
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate({
        currentVolume: volume,
        isActive: volume >= this.SILENCE_THRESHOLD
      });
    }
    
    // Continue loop
    this.animationId = requestAnimationFrame(this.analyze);
  };
  
  stop(): VoiceAnalysisResult {
    console.log("[AudioAnalyzer] Stopping...");
    this.isRunning = false;
    
    // Cancel animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Calculate final results
    const result = this.calculateResults();
    console.log("[AudioAnalyzer] Final results:", result);
    return result;
  }
  
  private calculateResults(): VoiceAnalysisResult {
    if (this.volumeSamples.length === 0) {
      return {
        averageVolume: 0,
        volumeVariation: 0,
        silencePercentage: 100,
        peakVolume: 0,
        volumeConsistency: "too-quiet"
      };
    }
    
    // Calculate average
    const sum = this.volumeSamples.reduce((a, b) => a + b, 0);
    const avg = sum / this.volumeSamples.length;
    
    // Calculate standard deviation (volume variation)
    const squaredDiffs = this.volumeSamples.map(v => Math.pow(v - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Peak volume
    const peak = Math.max(...this.volumeSamples);
    
    // Silence percentage
    const silencePercent = this.totalFrames > 0 
      ? (this.silentFrames / this.totalFrames) * 100 
      : 100;
    
    // Determine consistency
    let consistency: VoiceAnalysisResult["volumeConsistency"];
    if (avg < 10) {
      consistency = "too-quiet";
    } else if (avg > 80) {
      consistency = "too-loud";
    } else if (stdDev < 3) {
      consistency = "inconsistent"; // Too monotone
    } else {
      consistency = "good";
    }
    
    return {
      averageVolume: Math.round(avg),
      volumeVariation: Math.round(stdDev),
      silencePercentage: Math.round(silencePercent),
      peakVolume: Math.round(peak),
      volumeConsistency: consistency
    };
  }
}
