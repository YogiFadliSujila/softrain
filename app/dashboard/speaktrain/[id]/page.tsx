"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Mic, MicOff, ArrowLeft, Zap, Loader2, AlertTriangle, 
  Trophy, Play, Square, Clock, RotateCcw, CheckCircle, Volume2, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioAnalyzer, VoiceAnalysisResult, VoiceMetrics } from "@/lib/audio-analyzer";
import { WebcamFeedback } from "@/components/webcam-feedback";
import { FaceAnalysisResult } from "@/lib/face-analyzer";

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
  const faceResultRef = useRef<FaceAnalysisResult | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
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

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">{challenge.content.topic}</h1>
          {randomTopic && (
            <p className="text-muted-foreground italic">&quot;{randomTopic}&quot;</p>
          )}
        </div>

        {/* Timer */}
        <div className="text-center">
          <div className={`text-6xl font-mono font-bold ${
            isOvertime ? "text-red-500" : recordingTime >= targetDuration * 0.8 ? "text-yellow-500" : "text-green-500"
          }`}>
            {formatTime(recordingTime)}
          </div>
          <p className="text-muted-foreground">
            Target: {formatTime(targetDuration)}
          </p>
        </div>

        {/* Recording indicator with volume meter */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ scale: isVoiceActive ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.3, repeat: isVoiceActive ? Infinity : 0 }}
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center"
          >
            <Mic className="h-10 w-10 text-white" />
          </motion.div>
          
          {/* Volume Meter - NEW */}
          <div className="w-full max-w-xs">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Volume</span>
              <span className="text-xs ml-auto">{currentVolume}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${getVolumeColor(currentVolume)} transition-colors`}
                animate={{ width: `${currentVolume}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Pelan</span>
              <span>Ideal</span>
              <span>Keras</span>
            </div>
          </div>
        </div>

        {/* Webcam Feedback - Optional Face Analysis */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Analisis Ekspresi (Opsional)</span>
            </div>
            <WebcamFeedback 
              isActive={isRecording}
              onResult={(result) => {
                faceResultRef.current = result;
              }}
            />
          </CardContent>
        </Card>

        {/* Live transcript */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Transkripsi Real-time</span>
              <span>{wordCount} kata</span>
            </div>
            <div className="min-h-[100px] p-3 rounded-lg bg-muted text-sm">
              {transcript || <span className="text-muted-foreground italic">Mulai berbicara...</span>}
            </div>
          </CardContent>
        </Card>

        {/* Stop button */}
        <Button 
          onClick={stopRecording} 
          variant="destructive" 
          className="w-full"
          size="lg"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Square className="h-5 w-5 mr-2" />
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
