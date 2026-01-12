/**
 * Face Analyzer - Facial Expression Analysis using face-api.js
 * 
 * Analyzes:
 * - Smile detection (happy expression)
 * - Eye contact (face looking at camera)
 * - Expression variation
 */

import * as faceapi from 'face-api.js';

export interface FaceAnalysisResult {
  averageSmileScore: number;      // 0-100, how often smiling
  eyeContactScore: number;        // 0-100, face detected looking forward
  expressionVariety: number;      // 0-100, variety of expressions
  dominantExpression: string;     // Most common expression
  faceDetectionRate: number;      // % of time face was detected
}

export interface FaceMetrics {
  isSmiling: boolean;
  smileIntensity: number;         // 0-100
  hasFace: boolean;
  currentExpression: string;
  allExpressions?: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  };
}

type MetricsCallback = (metrics: FaceMetrics) => void;

export class FaceAnalyzer {
  private isRunning: boolean = false;
  private animationId: number | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private onMetricsUpdate: MetricsCallback | null = null;
  
  // Tracking data
  private smileScores: number[] = [];
  private facesDetected: number = 0;
  private totalFrames: number = 0;
  private expressionCounts: Record<string, number> = {};
  
  private static modelsLoaded: boolean = false;
  
  /**
   * Load face-api.js models (call once at app start)
   */
  static async loadModels(): Promise<boolean> {
    if (FaceAnalyzer.modelsLoaded) {
      console.log("[FaceAnalyzer] Models already loaded");
      return true;
    }
    
    try {
      const MODEL_URL = '/models';
      
      console.log("[FaceAnalyzer] Loading models from", MODEL_URL);
      
      // Load minimal models for expression detection
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      FaceAnalyzer.modelsLoaded = true;
      console.log("[FaceAnalyzer] Models loaded successfully");
      return true;
    } catch (error) {
      console.error("[FaceAnalyzer] Failed to load models:", error);
      return false;
    }
  }
  
  /**
   * Check if models are loaded
   */
  static isReady(): boolean {
    return FaceAnalyzer.modelsLoaded;
  }
  
  /**
   * Start face analysis with webcam
   */
  async start(videoElement: HTMLVideoElement, onUpdate?: MetricsCallback): Promise<boolean> {
    try {
      console.log("[FaceAnalyzer] Starting...");
      
      // Ensure models are loaded
      if (!FaceAnalyzer.modelsLoaded) {
        const loaded = await FaceAnalyzer.loadModels();
        if (!loaded) {
          console.error("[FaceAnalyzer] Models not loaded");
          return false;
        }
      }
      
      // Get webcam access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user'
        }
      });
      
      this.video = videoElement;
      this.video.srcObject = this.stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        if (this.video) {
          this.video.onloadedmetadata = () => {
            this.video?.play();
            resolve();
          };
        }
      });
      
      console.log("[FaceAnalyzer] Video ready");
      
      // Set callback
      this.onMetricsUpdate = onUpdate || null;
      
      // Reset tracking
      this.smileScores = [];
      this.facesDetected = 0;
      this.totalFrames = 0;
      this.expressionCounts = {};
      
      // Start analysis loop
      this.isRunning = true;
      this.analyze();
      
      console.log("[FaceAnalyzer] Started successfully");
      return true;
    } catch (error) {
      console.error("[FaceAnalyzer] Start error:", error);
      return false;
    }
  }
  
  private analyze = async (): Promise<void> => {
    if (!this.isRunning || !this.video) {
      return;
    }
    
    try {
      // Detect faces with expressions
      const detection = await faceapi
        .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.5
        }))
        .withFaceExpressions();
      
      this.totalFrames++;
      
      if (detection) {
        this.facesDetected++;
        
        const expressions = detection.expressions;
        
        // Get dominant expression
        const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
        const dominant = sorted[0][0];
        
        // Track expression counts
        this.expressionCounts[dominant] = (this.expressionCounts[dominant] || 0) + 1;
        
        // Calculate smile score (happy expression)
        const smileScore = Math.round(expressions.happy * 100);
        this.smileScores.push(smileScore);
        
        // Send real-time update with all 7 expressions
        if (this.onMetricsUpdate) {
          this.onMetricsUpdate({
            isSmiling: smileScore > 30,
            smileIntensity: smileScore,
            hasFace: true,
            currentExpression: dominant,
            allExpressions: {
              neutral: expressions.neutral,
              happy: expressions.happy,
              sad: expressions.sad,
              angry: expressions.angry,
              fearful: expressions.fearful,
              disgusted: expressions.disgusted,
              surprised: expressions.surprised
            }
          });
        }
      } else {
        // No face detected
        if (this.onMetricsUpdate) {
          this.onMetricsUpdate({
            isSmiling: false,
            smileIntensity: 0,
            hasFace: false,
            currentExpression: 'none'
          });
        }
      }
    } catch (error) {
      console.error("[FaceAnalyzer] Analysis error:", error);
    }
    
    // Continue loop (slower rate for performance ~10fps)
    if (this.isRunning) {
      this.animationId = window.setTimeout(() => {
        this.analyze();
      }, 100) as unknown as number;
    }
  };
  
  /**
   * Stop analysis and get results
   */
  stop(): FaceAnalysisResult {
    console.log("[FaceAnalyzer] Stopping...");
    this.isRunning = false;
    
    // Cancel animation
    if (this.animationId) {
      clearTimeout(this.animationId);
      this.animationId = null;
    }
    
    // Stop video stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    
    // Calculate results
    const result = this.calculateResults();
    console.log("[FaceAnalyzer] Final results:", result);
    return result;
  }
  
  private calculateResults(): FaceAnalysisResult {
    // Average smile score
    const avgSmile = this.smileScores.length > 0
      ? Math.round(this.smileScores.reduce((a, b) => a + b, 0) / this.smileScores.length)
      : 0;
    
    // Face detection rate (as eye contact proxy)
    const detectionRate = this.totalFrames > 0
      ? Math.round((this.facesDetected / this.totalFrames) * 100)
      : 0;
    
    // Dominant expression
    const sorted = Object.entries(this.expressionCounts).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0]?.[0] || 'neutral';
    
    // Expression variety (how many different expressions)
    const uniqueExpressions = Object.keys(this.expressionCounts).length;
    const varietyScore = Math.min(100, uniqueExpressions * 20);
    
    return {
      averageSmileScore: avgSmile,
      eyeContactScore: detectionRate,
      expressionVariety: varietyScore,
      dominantExpression: dominant,
      faceDetectionRate: detectionRate
    };
  }
  
  /**
   * Check if webcam is available
   */
  static async isWebcamAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }
}

/**
 * Expression labels in Indonesian
 */
export const expressionLabels: Record<string, string> = {
  neutral: 'Netral',
  happy: 'Senang',
  sad: 'Sedih',
  angry: 'Marah',
  fearful: 'Takut',
  disgusted: 'Jijik',
  surprised: 'Terkejut',
  none: 'Tidak terdeteksi'
};
