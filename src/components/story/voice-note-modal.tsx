"use client";

import { useState, useRef, useEffect } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { uploadRoomMedia } from "@/lib/firebase/storage";
import { createStoryPost } from "@/lib/services/storyService";
import { AudioPlayer } from "./audio-player";
import { X, Mic, Square, RotateCcw, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface VoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceNoteModal({ isOpen, onClose }: VoiceNoteModalProps) {
  const { room, currentUser } = useRoomStore();
  const partner = room?.members.find((m) => m.id !== currentUser?.id);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  // Cleanup on close or unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Browser tidak mendukung perekaman suara");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);
        stopRecordingCleanup();
      };

      recorder.start(200); // Collect 200ms slices
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 180) {
            // Auto stop at 3 minutes
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Gagal memulai rekaman:", err);
      toast.error("Izin mikrofon diperlukan untuk merekam suara.");
      stopRecordingCleanup();
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordSeconds(0);
    setIsRecording(false);
    stopRecordingCleanup();
  };

  const handleClose = () => {
    resetRecording();
    setTitle("");
    setCaption("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!room?.id || !currentUser || !audioBlob) {
      toast.error("Rekam suara terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    try {
      toast.info("Mengunggah pesan suara... 🎙️");

      // 1. Upload audio Blob to Firebase Storage
      const uploadedAudioUrl = await uploadRoomMedia(
        room.id,
        "voice_notes",
        audioBlob,
        audioBlob.type.includes("mp4") ? "mp4" : "webm"
      );

      // 2. Create story post of category 'voice'
      const finalTitle =
        title.trim() ||
        (partner ? `Pesan Suara untuk ${partner.name} 💕` : "Pesan Suara Kenangan 🎙️");
      const finalCaption =
        caption.trim() || `Rekaman suara (${Math.max(1, recordSeconds)} detik)`;

      await createStoryPost(room.id, currentUser, {
        title: finalTitle,
        caption: finalCaption,
        category: "voice",
        images: [],
        date: new Date().toISOString().split("T")[0],
        audioUrl: uploadedAudioUrl,
        audioDuration: Math.max(1, recordSeconds),
      });

      toast.success("Pesan suara berhasil terkirim ke Story! 💕✨");
      handleClose();
    } catch (err) {
      console.error("Gagal mengirim voice note:", err);
      toast.error("Gagal mengunggah pesan suara.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eee7e3] bg-[#faf2ee]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffdada] text-[#b80035] flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1e1b19]">Pesan Suara Berdua</h3>
              <p className="text-[10px] text-[#5c3f40]">Kirim ucapan manis atau suara hangat</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#5c3f40] hover:text-[#1e1b19] border border-[#e5bdbe]/40 active:scale-90 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 pb-8 sm:pb-6 flex flex-col items-center space-y-5">
          {!audioUrl ? (
            /* Recording Mode */
            <div className="flex flex-col items-center space-y-4 py-2 w-full">
              {/* Mic Icon Button with animated pulse rings */}
              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <>
                    <span className="absolute w-24 h-24 rounded-full bg-rose-400/20 animate-ping" />
                    <span className="absolute w-28 h-28 rounded-full bg-rose-300/30 animate-pulse" />
                  </>
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
                    isRecording
                      ? "bg-[#b80035] text-white ring-4 ring-[#ffdada]"
                      : "bg-gradient-to-br from-[#ffdada] to-[#faf2ee] text-[#b80035] hover:scale-105 border-2 border-[#e5bdbe]"
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-7 h-7 fill-white" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Status / Timer */}
              <div className="text-center space-y-1">
                {isRecording ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                    <span className="text-lg font-bold text-[#b80035] tracking-wider">
                      {formatSecs(recordSeconds)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-[#1e1b19] block">
                    Tekan mic untuk mulai merekam
                  </span>
                )}
                <p className="text-[11px] text-[#5c3f40]">
                  {isRecording
                    ? "Tekan tombol kotak untuk berhenti merekam (maks 3 menit)"
                    : "Bisa untuk ucapan selamat pagi, selamat tidur, atau cerita hari ini 🎙️"}
                </p>
              </div>
            </div>
          ) : (
            /* Preview & Send Mode */
            <div className="w-full space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-[#1e1b19] flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#b80035]" />
                  <span>Dengarkan Hasil Rekaman</span>
                </span>
                <p className="text-[10px] text-[#5c3f40]">
                  Durasi: {formatSecs(recordSeconds)}
                </p>
              </div>

              {/* Audio Player Preview */}
              <AudioPlayer src={audioUrl} duration={recordSeconds} />

              {/* Title & Caption */}
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder={
                    partner
                      ? `Judul: Pesan Suara untuk ${partner.name}...`
                      : "Judul pesan suara..."
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#faf2ee] border border-[#e5bdbe]/40 text-xs text-[#1e1b19] placeholder-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#b80035]"
                />
                <input
                  type="text"
                  placeholder="Catatan / caption singkat (opsional)..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#faf2ee] border border-[#e5bdbe]/40 text-xs text-[#1e1b19] placeholder-[#5c3f40]/50 focus:outline-none focus:ring-2 focus:ring-[#b80035]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetRecording}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#faf2ee] hover:bg-[#ffdada] text-[#5c3f40] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#e5bdbe]/40 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ulangi</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#b80035] to-[#e11d48] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim ke Story 💕</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
