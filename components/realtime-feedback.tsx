"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Volume2, VolumeX, Mic, Eye, Smile, Lightbulb
} from "lucide-react";

interface VoiceMetrics {
  currentVolume: number;
  isActive: boolean;
}

interface FaceMetrics {
  hasFace: boolean;
  isSmiling: boolean;
  smileIntensity: number;
  currentExpression: string;
}

interface RealtimeFeedbackProps {
  voiceMetrics: VoiceMetrics | null;
  faceMetrics: FaceMetrics | null;
  recordingTime: number;
  enabled?: boolean;
}

interface Tip {
  id: string;
  icon: React.ReactNode;
  message: string;
  type: "warning" | "success" | "info";
  priority: number;
}

export function RealtimeFeedback({ 
  voiceMetrics, 
  faceMetrics, 
  recordingTime,
  enabled = true
}: RealtimeFeedbackProps) {
  if (!enabled) return null;

  const tips: Tip[] = [];

  // Voice-based tips
  if (voiceMetrics) {
    // Volume too low (after 3 seconds of recording)
    if (recordingTime > 3 && voiceMetrics.currentVolume < 10 && !voiceMetrics.isActive) {
      tips.push({
        id: "volume-low",
        icon: <VolumeX className="h-5 w-5" />,
        message: "Bicara lebih keras",
        type: "warning",
        priority: 1
      });
    }
    
    // Volume too high
    if (voiceMetrics.currentVolume > 80) {
      tips.push({
        id: "volume-high",
        icon: <Volume2 className="h-5 w-5" />,
        message: "Pelankan suara sedikit",
        type: "warning",
        priority: 2
      });
    }
    
    // Good volume - only show occasionally
    if (voiceMetrics.currentVolume >= 30 && voiceMetrics.currentVolume <= 60 && voiceMetrics.isActive && recordingTime % 10 < 3) {
      tips.push({
        id: "volume-good",
        icon: <Mic className="h-5 w-5" />,
        message: "Bagus! Volume suara ideal",
        type: "success",
        priority: 5
      });
    }
  }

  // Face-based tips (only if webcam enabled)
  if (faceMetrics) {
    // Not looking at camera
    if (!faceMetrics.hasFace && recordingTime > 2) {
      tips.push({
        id: "no-face",
        icon: <Eye className="h-5 w-5" />,
        message: "Lihat ke kamera",
        type: "warning",
        priority: 1
      });
    }
    
    // Not smiling (encourage after some time)
    if (faceMetrics.hasFace && !faceMetrics.isSmiling && recordingTime > 15 && recordingTime % 15 < 5) {
      tips.push({
        id: "no-smile",
        icon: <Smile className="h-5 w-5" />,
        message: "Coba tersenyum ramah",
        type: "info",
        priority: 3
      });
    }
    
    // Good expression
    if (faceMetrics.hasFace && faceMetrics.isSmiling && faceMetrics.smileIntensity > 50) {
      tips.push({
        id: "good-smile",
        icon: <Smile className="h-5 w-5" />,
        message: "Ekspresi ramah! Bagus!",
        type: "success",
        priority: 5
      });
    }
  }

  // Sort by priority and limit to 1 most important tip
  const sortedTips = tips.sort((a, b) => a.priority - b.priority);
  const displayTip = sortedTips[0];

  if (!displayTip) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayTip.id}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-medium shadow-sm ${
          displayTip.type === "warning" 
            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800" 
            : displayTip.type === "success"
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
        }`}
      >
        <div className={`p-2 rounded-full ${
          displayTip.type === "warning" 
            ? "bg-yellow-200 dark:bg-yellow-800" 
            : displayTip.type === "success"
              ? "bg-green-200 dark:bg-green-800"
              : "bg-blue-200 dark:bg-blue-800"
        }`}>
          {displayTip.icon}
        </div>
        <span>{displayTip.message}</span>
        {displayTip.type === "warning" && (
          <Lightbulb className="h-4 w-4 ml-1 opacity-70" />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
