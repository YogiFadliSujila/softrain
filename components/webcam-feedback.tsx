"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, Smile, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaceAnalyzer, FaceAnalysisResult, FaceMetrics, expressionLabels } from "@/lib/face-analyzer";

interface WebcamFeedbackProps {
  isActive: boolean;
  onResult?: (result: FaceAnalysisResult) => void;
}

// All 7 expressions with colors
const expressionColors: Record<string, string> = {
  neutral: "bg-gray-400",
  happy: "bg-yellow-400",
  sad: "bg-blue-400",
  angry: "bg-red-500",
  fearful: "bg-purple-400",
  disgusted: "bg-green-500",
  surprised: "bg-orange-400",
};

interface AllExpressions {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

export function WebcamFeedback({ isActive, onResult }: WebcamFeedbackProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasWebcam, setHasWebcam] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [metrics, setMetrics] = useState<FaceMetrics & { allExpressions?: AllExpressions }>({
    isSmiling: false,
    smileIntensity: 0,
    hasFace: false,
    currentExpression: 'none'
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const analyzerRef = useRef<FaceAnalyzer | null>(null);
  const resultRef = useRef<FaceAnalysisResult | null>(null);

  // Check webcam availability
  useEffect(() => {
    FaceAnalyzer.isWebcamAvailable().then(available => {
      setHasWebcam(available);
    });
  }, []);

  // Load models on mount
  useEffect(() => {
    FaceAnalyzer.loadModels().then(loaded => {
      setModelsLoaded(loaded);
    });
  }, []);

  // Handle metrics update
  const handleMetrics = useCallback((m: FaceMetrics & { allExpressions?: AllExpressions }) => {
    setMetrics(m);
  }, []);

  // Start/stop analyzer when enabled changes
  useEffect(() => {
    if (enabled && isActive && modelsLoaded && videoRef.current) {
      startAnalysis();
    }
    
    return () => {
      stopAnalysis();
    };
  }, [enabled, isActive, modelsLoaded]);

  // Stop when recording ends
  useEffect(() => {
    if (!isActive && analyzerRef.current) {
      const result = analyzerRef.current.stop();
      resultRef.current = result;
      analyzerRef.current = null;
      
      if (onResult) {
        onResult(result);
      }
    }
  }, [isActive, onResult]);

  const startAnalysis = async () => {
    if (!videoRef.current || analyzerRef.current) return;
    
    setLoading(true);
    
    try {
      analyzerRef.current = new FaceAnalyzer();
      const started = await analyzerRef.current.start(videoRef.current, handleMetrics);
      
      if (!started) {
        setEnabled(false);
        analyzerRef.current = null;
      }
    } catch (err) {
      console.error("Start analysis error:", err);
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const stopAnalysis = () => {
    if (analyzerRef.current) {
      resultRef.current = analyzerRef.current.stop();
      analyzerRef.current = null;
    }
  };

  const toggleWebcam = async () => {
    if (enabled) {
      stopAnalysis();
      setEnabled(false);
    } else {
      setEnabled(true);
    }
  };

  if (!hasWebcam) {
    return null;
  }

  if (!modelsLoaded) {
    return (
      <div className="p-3 rounded-lg bg-muted text-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
        Loading AI models...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toggle Button */}
      <Button
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={toggleWebcam}
        disabled={loading || !isActive}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : enabled ? (
          <CameraOff className="h-4 w-4 mr-2" />
        ) : (
          <Camera className="h-4 w-4 mr-2" />
        )}
        {enabled ? "Matikan Kamera" : "Aktifkan Analisis Ekspresi"}
      </Button>

      {/* Webcam Preview */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            
            {/* Face indicator */}
            <div className="absolute top-2 left-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                metrics.hasFace 
                  ? "bg-green-500/80 text-white" 
                  : "bg-yellow-500/80 text-white"
              }`}>
                {metrics.hasFace ? "Wajah Terdeteksi" : "Hadap Kamera"}
              </div>
            </div>

            {/* Smile indicator */}
            {metrics.hasFace && metrics.isSmiling && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2"
              >
                <div className="bg-yellow-400 rounded-full p-1">
                  <Smile className="h-5 w-5 text-yellow-800" />
                </div>
              </motion.div>
            )}
          </div>

          {/* All 7 Expressions Display */}
          {metrics.hasFace && metrics.allExpressions && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">7 Ekspresi Dasar:</p>
              {Object.entries(metrics.allExpressions).map(([expr, value]) => (
                <div key={expr} className="flex items-center gap-2">
                  <span className="text-xs w-16 truncate">{expressionLabels[expr] || expr}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${expressionColors[expr] || "bg-primary"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(value * 100)}%` }}
                      transition={{ duration: 0.15 }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right">{Math.round(value * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Dominant Expression */}
          {metrics.hasFace && (
            <div className="text-center p-2 rounded bg-muted">
              <span className="text-sm">Ekspresi: </span>
              <span className="font-medium">{expressionLabels[metrics.currentExpression] || metrics.currentExpression}</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
