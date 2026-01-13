/**
 * Gesture Analyzer - Hand Gesture Recognition using MediaPipe Hands
 * 
 * Uses dynamic script loading for MediaPipe Hands since the npm package
 * doesn't export properly for Next.js/Turbopack.
 */

export interface GestureResult {
  handsDetected: number;
  gestureActivityPercent: number;
  dominantGesture: string;
  gestureVariety: number;
}

export interface GestureMetrics {
  handsDetected: number;
  currentGesture: string;
  isActive: boolean;
}

type MetricsCallback = (metrics: GestureMetrics) => void;

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface HandResults {
  multiHandLandmarks?: HandLandmark[][];
}

// Gesture detection thresholds
const FINGER_EXTENDED_THRESHOLD = 0.1;

// MediaPipe Hands global after script load
declare global {
  interface Window {
    Hands: new (config: { locateFile: (file: string) => string }) => {
      setOptions: (options: Record<string, unknown>) => void;
      onResults: (callback: (results: HandResults) => void) => void;
      send: (input: { image: HTMLVideoElement }) => Promise<void>;
      close: () => void;
    };
  }
}

export class GestureAnalyzer {
  private hands: InstanceType<typeof window.Hands> | null = null;
  private isRunning: boolean = false;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private onMetricsUpdate: MetricsCallback | null = null;
  private animationId: number | null = null;
  
  // Tracking
  private gestureHistory: string[] = [];
  private framesWithHands: number = 0;
  private totalFrames: number = 0;
  private gestureCounts: Record<string, number> = {};
  
  private static scriptLoaded: boolean = false;
  private static scriptLoading: boolean = false;

  private static async loadScript(): Promise<boolean> {
    if (GestureAnalyzer.scriptLoaded) return true;
    if (GestureAnalyzer.scriptLoading) {
      // Wait for existing load
      await new Promise(resolve => setTimeout(resolve, 1000));
      return GestureAnalyzer.scriptLoaded;
    }
    
    GestureAnalyzer.scriptLoading = true;
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        console.log('[GestureAnalyzer] MediaPipe script loaded');
        GestureAnalyzer.scriptLoaded = true;
        GestureAnalyzer.scriptLoading = false;
        resolve(true);
      };
      script.onerror = () => {
        console.error('[GestureAnalyzer] Failed to load MediaPipe script');
        GestureAnalyzer.scriptLoading = false;
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  async start(
    videoElement: HTMLVideoElement, 
    canvasElement: HTMLCanvasElement,
    onUpdate?: MetricsCallback
  ): Promise<boolean> {
    try {
      console.log("[GestureAnalyzer] Starting...");
      
      // Load MediaPipe script first
      const loaded = await GestureAnalyzer.loadScript();
      if (!loaded || !window.Hands) {
        console.error("[GestureAnalyzer] MediaPipe not available");
        return false;
      }
      
      this.video = videoElement;
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d');
      this.onMetricsUpdate = onUpdate || null;
      
      // Initialize MediaPipe Hands
      this.hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
      
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      this.hands.onResults((results: HandResults) => this.onResults(results));
      
      // Reset tracking
      this.gestureHistory = [];
      this.framesWithHands = 0;
      this.totalFrames = 0;
      this.gestureCounts = {};
      
      this.isRunning = true;
      this.processFrame();
      
      console.log("[GestureAnalyzer] Started successfully");
      return true;
    } catch (error) {
      console.error("[GestureAnalyzer] Start error:", error);
      return false;
    }
  }
  
  private processFrame = async (): Promise<void> => {
    if (!this.isRunning || !this.video || !this.hands) {
      return;
    }
    
    try {
      if (this.video.readyState >= 2) {
        await this.hands.send({ image: this.video });
      }
    } catch (error) {
      console.error("[GestureAnalyzer] Frame error:", error);
    }
    
    // Continue loop at ~10fps for performance
    if (this.isRunning) {
      this.animationId = window.setTimeout(() => {
        this.processFrame();
      }, 100) as unknown as number;
    }
  };
  
  private onResults = (results: HandResults): void => {
    this.totalFrames++;
    
    if (!this.ctx || !this.canvas || !this.video) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      this.framesWithHands++;
      
      // Analyze first hand's gesture
      const landmarks = results.multiHandLandmarks[0];
      const gesture = this.detectGesture(landmarks);
      
      // Track gesture
      this.gestureHistory.push(gesture);
      this.gestureCounts[gesture] = (this.gestureCounts[gesture] || 0) + 1;
      
      // Draw hand landmarks
      this.drawHand(landmarks);
      
      // Callback
      if (this.onMetricsUpdate) {
        this.onMetricsUpdate({
          handsDetected: results.multiHandLandmarks.length,
          currentGesture: gesture,
          isActive: gesture !== 'none'
        });
      }
    } else {
      if (this.onMetricsUpdate) {
        this.onMetricsUpdate({
          handsDetected: 0,
          currentGesture: 'none',
          isActive: false
        });
      }
    }
  };
  
  private detectGesture(landmarks: HandLandmark[]): string {
    const thumb = this.isFingerExtended(landmarks, 'thumb');
    const index = this.isFingerExtended(landmarks, 'index');
    const middle = this.isFingerExtended(landmarks, 'middle');
    const ring = this.isFingerExtended(landmarks, 'ring');
    const pinky = this.isFingerExtended(landmarks, 'pinky');
    
    if (thumb && !index && !middle && !ring && !pinky) return 'thumbs_up';
    if (!thumb && index && !middle && !ring && !pinky) return 'pointing';
    if (thumb && index && middle && ring && pinky) return 'open_palm';
    if (!thumb && !index && !middle && !ring && !pinky) return 'fist';
    if (!thumb && index && middle && !ring && !pinky) return 'peace';
    
    return 'other';
  }
  
  private isFingerExtended(landmarks: HandLandmark[], finger: string): boolean {
    const fingerTips: Record<string, number> = {
      thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20
    };
    const fingerMcp: Record<string, number> = {
      thumb: 2, index: 5, middle: 9, ring: 13, pinky: 17
    };
    
    const tipIdx = fingerTips[finger];
    const mcpIdx = fingerMcp[finger];
    if (!tipIdx || !mcpIdx) return false;
    
    const tip = landmarks[tipIdx];
    const mcp = landmarks[mcpIdx];
    
    if (finger === 'thumb') {
      return Math.abs(tip.x - mcp.x) > FINGER_EXTENDED_THRESHOLD;
    }
    return mcp.y - tip.y > FINGER_EXTENDED_THRESHOLD;
  }
  
  private drawHand(landmarks: HandLandmark[]): void {
    if (!this.ctx || !this.canvas) return;
    
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];
    
    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 2;
    
    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x * this.canvas.width, p1.y * this.canvas.height);
      this.ctx.lineTo(p2.x * this.canvas.width, p2.y * this.canvas.height);
      this.ctx.stroke();
    }
    
    this.ctx.fillStyle = '#FF0000';
    for (const point of landmarks) {
      this.ctx.beginPath();
      this.ctx.arc(point.x * this.canvas.width, point.y * this.canvas.height, 4, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }
  
  stop(): GestureResult {
    console.log("[GestureAnalyzer] Stopping...");
    this.isRunning = false;
    
    if (this.animationId) {
      clearTimeout(this.animationId);
      this.animationId = null;
    }
    
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    
    return this.calculateResults();
  }
  
  private calculateResults(): GestureResult {
    const activityPercent = this.totalFrames > 0
      ? Math.round((this.framesWithHands / this.totalFrames) * 100)
      : 0;
    
    const sorted = Object.entries(this.gestureCounts).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0]?.[0] || 'none';
    const variety = Object.keys(this.gestureCounts).length;
    
    return {
      handsDetected: this.framesWithHands > 0 ? 1 : 0,
      gestureActivityPercent: activityPercent,
      dominantGesture: dominant,
      gestureVariety: variety
    };
  }
}

export const gestureLabels: Record<string, string> = {
  open_palm: 'Telapak Terbuka',
  pointing: 'Menunjuk',
  fist: 'Kepalan',
  thumbs_up: 'Jempol',
  peace: 'Damai',
  other: 'Lainnya',
  none: 'Tidak terdeteksi'
};
