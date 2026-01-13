"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Hand, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GestureAnalyzer, GestureResult, GestureMetrics, gestureLabels } from "@/lib/gesture-analyzer";

interface GestureDisplayProps {
  isActive: boolean;
  videoElement: HTMLVideoElement | null;
  onResult?: (result: GestureResult) => void;
  onMetricsUpdate?: (metrics: GestureMetrics) => void;
}

export function GestureDisplay({ 
  isActive, 
  videoElement, 
  onResult,
  onMetricsUpdate 
}: GestureDisplayProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<GestureMetrics>({
    handsDetected: 0,
    currentGesture: 'none',
    isActive: false
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<GestureAnalyzer | null>(null);

  // Handle metrics update
  const handleMetrics = useCallback((m: GestureMetrics) => {
    setMetrics(m);
    if (onMetricsUpdate) {
      onMetricsUpdate(m);
    }
  }, [onMetricsUpdate]);

  // Start/stop analyzer
  useEffect(() => {
    if (enabled && isActive && videoElement && canvasRef.current) {
      startAnalysis();
    }
    
    return () => {
      stopAnalysis();
    };
  }, [enabled, isActive, videoElement]);

  // Stop when recording ends
  useEffect(() => {
    if (!isActive && analyzerRef.current) {
      const result = analyzerRef.current.stop();
      analyzerRef.current = null;
      
      if (onResult) {
        onResult(result);
      }
    }
  }, [isActive, onResult]);

  const startAnalysis = async () => {
    if (!videoElement || !canvasRef.current || analyzerRef.current) return;
    
    setLoading(true);
    
    try {
      // Set canvas size to match video
      canvasRef.current.width = videoElement.videoWidth || 320;
      canvasRef.current.height = videoElement.videoHeight || 240;
      
      analyzerRef.current = new GestureAnalyzer();
      const started = await analyzerRef.current.start(
        videoElement, 
        canvasRef.current, 
        handleMetrics
      );
      
      if (!started) {
        setEnabled(false);
        analyzerRef.current = null;
      }
    } catch (err) {
      console.error("Start gesture analysis error:", err);
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const stopAnalysis = () => {
    if (analyzerRef.current) {
      analyzerRef.current.stop();
      analyzerRef.current = null;
    }
  };

  const toggleGesture = () => {
    if (enabled) {
      stopAnalysis();
      setEnabled(false);
    } else {
      setEnabled(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toggle Button */}
      <Button
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={toggleGesture}
        disabled={loading || !isActive || !videoElement}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Hand className="h-4 w-4 mr-2" />
        )}
        {enabled ? "Matikan Analisis Gestur" : "Aktifkan Analisis Gestur"}
      </Button>

      {/* Gesture Visualization */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          {/* Canvas overlay for hand landmarks */}
          <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-video">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
            />
            
            {/* Hand indicator */}
            <div className="absolute top-2 left-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                metrics.handsDetected > 0 
                  ? "bg-green-500/80 text-white" 
                  : "bg-gray-500/80 text-white"
              }`}>
                {metrics.handsDetected > 0 
                  ? `${metrics.handsDetected} Tangan` 
                  : "Tidak ada tangan"}
              </div>
            </div>

            {/* Gesture indicator */}
            {metrics.handsDetected > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2"
              >
                <div className="bg-purple-500/80 px-2 py-1 rounded-full text-xs text-white font-medium">
                  {gestureLabels[metrics.currentGesture] || metrics.currentGesture}
                </div>
              </motion.div>
            )}
          </div>

          {/* Current Gesture Display */}
          <div className="text-center p-2 rounded bg-muted">
            <span className="text-sm">Gestur: </span>
            <span className="font-medium">
              {gestureLabels[metrics.currentGesture] || metrics.currentGesture}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
