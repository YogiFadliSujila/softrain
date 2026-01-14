"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Mic, MicOff, ArrowLeft, Zap, Loader2, AlertTriangle, 
  Trophy, Play, Square, Clock, RotateCcw, CheckCircle, Volume2, Camera, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioAnalyzer, VoiceAnalysisResult, VoiceMetrics } from "@/lib/audio-analyzer";
import { WebcamFeedback } from "@/components/webcam-feedback";
import { RealtimeFeedback } from "@/components/realtime-feedback";
import { FaceAnalysisResult, FaceMetrics } from "@/lib/face-analyzer";

// Import global SpeechRecognition types
import "@/types/speech-recognition";

interface Challenge {
  id: string;
  title: string;
  description: string;
  energy_cost: number;
  content: {
    topic: string;
    duration_seconds: number;
    prompt: string;
    tips: string[];
    example: string;
    random_topics?: string[];
    evaluation_criteria: {
      min_words: number;
      max_duration: number;
      key_elements: string[];
    };
    skill_focus: string[];
  };
}

interface FeedbackDetail {
  score: number;
  message: string;
  actual?: number;
  target?: number;
  wpm?: number;
}

interface Result {
  score: number;
  maxScore: number;
  pointsEarned: number;
  feedback: {
    duration: FeedbackDetail;
    wordCount: FeedbackDetail;
    fluency: FeedbackDetail;
    content: FeedbackDetail;
    voice?: FeedbackDetail;  // NEW: Voice analysis feedback
  };
  voiceAnalysis?: VoiceAnalysisResult;  // NEW: Raw voice data
}

type Phase = "prep" | "recording" | "result";

export default function SpeaktrainDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>("prep");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Speech recognition
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [randomTopic, setRandomTopic] = useState<string | null>(null);
  
  // Voice analysis
  const [currentVolume, setCurrentVolume] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const voiceResultRef = useRef<VoiceAnalysisResult | null>(null);
  
  // Face analysis (optional webcam)
  const [faceMetrics, setFaceMetrics] = useState<FaceMetrics | null>(null);
  const faceResultRef = useRef<FaceAnalysisResult | null>(null);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    params.then(p => setChallengeId(p.id));
  }, [params]);

  useEffect(() => {
    // Check for Web Speech API support
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!challengeId) return;
    
    async function fetchChallenge() {
      try {
        const res = await fetch(`/api/speaktrain?id=${challengeId}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else if (!data.accessible) {
          setError(`Perlu Level ${data.challenge.min_level} untuk mengakses`);
        } else {
          setChallenge(data.challenge);
          // If impromptu, pick random topic
          if (data.challenge.content.random_topics) {
            const topics = data.challenge.content.random_topics;
            setRandomTopic(topics[Math.floor(Math.random() * topics.length)]);
          }
        }
      } catch {
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchChallenge();
  }, [challengeId]);

  // Handle voice metrics update
  const handleVoiceMetrics = useCallback((metrics: VoiceMetrics) => {
    setCurrentVolume(metrics.currentVolume);
    setIsVoiceActive(metrics.isActive);
  }, []);

  const startRecording = useCallback(async () => {
    if (!challenge) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Browser tidak mendukung Web Speech API");
      return;
    }

    // Start audio analyzer for voice analysis
    audioAnalyzerRef.current = new AudioAnalyzer();
    const audioStarted = await audioAnalyzerRef.current.start(handleVoiceMetrics);
    
    if (!audioStarted) {
      console.warn("Audio analyzer failed to start - continuing without voice analysis");
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }
      const full = finalTranscript + interimTranscript;
      setTranscript(full);
      setWordCount(full.trim().split(/\s+/).filter(w => w.length > 0).length);
    };

    recognition.onerror = (event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorEvent = event as any;
      console.error("Speech recognition error:", errorEvent.error);
      if (errorEvent.error === "not-allowed") {
        setError("Akses mikrofon ditolak. Harap izinkan akses mikrofon.");
      }
    };

    recognition.onend = () => {
      // Restart if still recording (continuous mode workaround)
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Ignore if already started
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setPhase("recording");

    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(t => t + 1);
    }, 1000);
  }, [challenge, isRecording, handleVoiceMetrics]);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop audio analyzer and get results
    if (audioAnalyzerRef.current) {
      voiceResultRef.current = audioAnalyzerRef.current.stop();
      audioAnalyzerRef.current = null;
    }
    
    setIsRecording(false);
    setCurrentVolume(0);

    // Submit result
    if (!challengeId || !transcript.trim()) {
      setError("Tidak ada rekaman suara yang terdeteksi");
      setPhase("prep");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/speaktrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          transcript: transcript.trim(),
          durationSeconds: recordingTime,
          wordCount,
          voiceAnalysis: voiceResultRef.current  // Include voice analysis
        })
      });

      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        setPhase("prep");
      } else {
        setResult(data);
        setPhase("result");
      }
    } catch {
      setError("Gagal mengirim hasil");
      setPhase("prep");
    } finally {
      setSubmitting(false);
    }
  }, [challengeId, transcript, recordingTime, wordCount]);

  const resetPractice = () => {
    setPhase("prep");
    setTranscript("");
    setWordCount(0);
    setRecordingTime(0);
    setResult(null);
    setError(null);
    setCurrentVolume(0);
    voiceResultRef.current = null;
    if (challenge?.content.random_topics) {
      const topics = challenge.content.random_topics;
      setRandomTopic(topics[Math.floor(Math.random() * topics.length)]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get volume bar color
  const getVolumeColor = (volume: number) => {
    if (volume < 15) return "bg-yellow-500";
    if (volume > 70) return "bg-red-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!speechSupported) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Browser Tidak Didukung</h2>
        <p className="text-muted-foreground mb-4">
          Web Speech API tidak tersedia. Gunakan Chrome, Edge, atau Safari terbaru.
        </p>
        <Link href="/dashboard/speaktrain">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  if ((error && !challenge) || !challenge) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Tidak Dapat Diakses</h2>
        <p className="text-muted-foreground mb-4">{error || "Challenge tidak ditemukan"}</p>
        <Link href="/dashboard/speaktrain">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  // Result Phase
  if (phase === "result" && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Score */}
          <Card className="mb-6">
            <CardContent className="pt-6 text-center">
              <div className={`text-5xl font-bold mb-2 ${
                result.score >= 80 ? "text-green-500" : 
                result.score >= 60 ? "text-yellow-500" : "text-red-500"
              }`}>
                {result.score}
              </div>
              <p className="text-muted-foreground">Skor dari {result.maxScore}</p>
              {result.pointsEarned > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                  <Trophy className="h-5 w-5" />
                  <span className="font-medium">+{result.pointsEarned} Poin Komunikasi</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analisis Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Duration */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">Durasi</span>
                  <span className={result.feedback.duration.score >= 20 ? "text-green-600" : "text-yellow-600"}>
                    {result.feedback.duration.score}/25
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{result.feedback.duration.message}</p>
                <p className="text-xs mt-1">
                  Durasi: {result.feedback.duration.actual}s (target: {result.feedback.duration.target}s)
                </p>
              </div>

              {/* Word Count */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">Jumlah Kata</span>
                  <span className={result.feedback.wordCount.score >= 20 ? "text-green-600" : "text-yellow-600"}>
                    {result.feedback.wordCount.score}/25
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{result.feedback.wordCount.message}</p>
                <p className="text-xs mt-1">
                  {result.feedback.wordCount.actual} kata (min: {result.feedback.wordCount.target})
                </p>
              </div>

              {/* Fluency */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">Kecepatan Bicara</span>
                  <span className={result.feedback.fluency.score >= 20 ? "text-green-600" : "text-yellow-600"}>
                    {result.feedback.fluency.score}/25
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{result.feedback.fluency.message}</p>
                <p className="text-xs mt-1">{result.feedback.fluency.wpm} kata/menit</p>
              </div>

              {/* Voice Analysis - NEW */}
              {result.feedback.voice && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-purple-500" />
                      Analisis Suara
                    </span>
                    <span className={result.feedback.voice.score >= 18 ? "text-green-600" : "text-yellow-600"}>
                      {result.feedback.voice.score}/25
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.feedback.voice.message}</p>
                  {result.voiceAnalysis && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-background/50 rounded">
                        <p className="font-medium">{result.voiceAnalysis.averageVolume}%</p>
                        <p className="text-muted-foreground">Volume</p>
                      </div>
                      <div className="text-center p-2 bg-background/50 rounded">
                        <p className="font-medium">{result.voiceAnalysis.volumeVariation}</p>
                        <p className="text-muted-foreground">Variasi</p>
                      </div>
                      <div className="text-center p-2 bg-background/50 rounded">
                        <p className="font-medium">{result.voiceAnalysis.silencePercentage}%</p>
                        <p className="text-muted-foreground">Jeda</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">Konten</span>
                  <span className={result.feedback.content.score >= 20 ? "text-green-600" : "text-yellow-600"}>
                    {result.feedback.content.score}/25
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{result.feedback.content.message}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={resetPractice} variant="outline" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
            <Link href="/dashboard/speaktrain" className="flex-1">
              <Button className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                Selesai
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Recording Phase
  if (phase === "recording") {
    const targetDuration = challenge.content.duration_seconds;
    const isOvertime = recordingTime > targetDuration;
    const progress = Math.min((recordingTime / targetDuration) * 100, 100);

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
        {/* Topic Header */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Topik</p>
          <h1 className="text-2xl font-bold">{challenge.content.topic}</h1>
          {randomTopic && (
            <p className="text-lg text-primary font-medium">&quot;{randomTopic}&quot;</p>
          )}
        </div>

        {/* Main Timer - Large & Central */}
        <div className="text-center py-6">
          <div className={`text-7xl md:text-8xl font-mono font-bold tracking-tight ${
            isOvertime ? "text-red-500" : recordingTime >= targetDuration * 0.8 ? "text-yellow-500" : "text-green-500"
          }`}>
            {formatTime(recordingTime)}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Target: {formatTime(targetDuration)}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
            <motion.div 
              className={`h-full ${isOvertime ? "bg-red-500" : "bg-primary"}`}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Recording Indicator + Volume - Integrated */}
        <div className="flex items-center justify-center gap-6">
          <motion.div
            animate={{ scale: isVoiceActive ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 0.4, repeat: isVoiceActive ? Infinity : 0 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
              <Mic className="h-10 w-10 text-white" />
            </div>
            {isVoiceActive && (
              <motion.div 
                className="absolute inset-0 rounded-full border-4 border-red-400"
                animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.div>

          {/* Volume Meter - Vertical Style */}
          <div className="flex flex-col items-center gap-1">
            <div className="h-20 w-4 bg-muted rounded-full overflow-hidden relative">
              <motion.div 
                className={`absolute bottom-0 w-full ${getVolumeColor(currentVolume)} rounded-full`}
                animate={{ height: `${currentVolume}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{currentVolume}%</span>
          </div>
        </div>

        {/* Real-time Coaching Tips - Prominent */}
        <div className="min-h-[56px]">
          <RealtimeFeedback 
            voiceMetrics={{ currentVolume, isActive: isVoiceActive }}
            faceMetrics={faceMetrics}
            recordingTime={recordingTime}
          />
        </div>

        {/* Collapsible AI Analysis Panel */}
        <details className="group">
          <summary className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Camera className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Analisis AI (Opsional)</p>
                <p className="text-xs text-muted-foreground">Ekspresi wajah & gestur tangan</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 p-4 border rounded-lg">
            <WebcamFeedback 
              isActive={isRecording}
              onResult={(result) => {
                faceResultRef.current = result;
              }}
              onMetricsUpdate={(metrics) => {
                setFaceMetrics(metrics);
              }}
            />
          </div>
        </details>

        {/* Live Transcript - Simplified */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Transkripsi</span>
            <span className="text-sm text-muted-foreground">{wordCount} kata</span>
          </div>
          <div className="min-h-[80px] p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
            {transcript || <span className="text-muted-foreground italic">Mulai berbicara...</span>}
          </div>
        </div>

        {/* Stop Button - Large & Clear */}
        <Button 
          onClick={stopRecording} 
          variant="destructive" 
          className="w-full h-14 text-lg font-semibold shadow-lg"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Square className="h-6 w-6 mr-3" />
              Selesai Berbicara
            </>
          )}
        </Button>
      </div>
    );
  }

  // Prep Phase
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/speaktrain">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{challenge.title}</h1>
          <p className="text-sm text-muted-foreground">{challenge.description}</p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{challenge.energy_cost}</span>
        </div>
      </div>

      {/* Topic */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg">{challenge.content.topic}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {randomTopic ? (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-lg font-medium italic">&quot;{randomTopic}&quot;</p>
            </div>
          ) : (
            <p className="text-muted-foreground">{challenge.content.prompt}</p>
          )}
          
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {challenge.content.duration_seconds} detik
            </span>
            <span>•</span>
            <span>Min. {challenge.content.evaluation_criteria.min_words} kata</span>
          </div>
        </CardContent>
      </Card>

      {/* NEW: Voice Analysis Info */}
      <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Volume2 className="h-5 w-5" />
            <span className="font-medium">Analisis Suara Real-time</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sistem akan menganalisis volume, intonasi, dan jeda bicara Anda untuk memberikan feedback yang lebih lengkap.
          </p>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {challenge.content.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-primary">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Example */}
      {challenge.content.example && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contoh</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">
              &quot;{challenge.content.example}&quot;
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Start button */}
      <Button onClick={startRecording} className="w-full" size="lg">
        <Play className="h-5 w-5 mr-2" />
        Mulai Berbicara
      </Button>
    </div>
  );
}

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
