"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, AlertCircle } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  duration?: number;
  compact?: boolean;
}

export function AudioPlayer({ src, duration: initialDuration, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setError(true);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Audio playback error:", err);
          setError(true);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-rose-50 text-rose-600 text-xs border border-rose-100">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Pesan suara tidak dapat diputar</span>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#ffdada]/40 via-[#faf2ee] to-white border border-[#e5bdbe]/50 shadow-2xs ${
        compact ? "py-2 px-3" : "p-3.5"
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-[#b80035] to-[#e11d48] text-white flex items-center justify-center shrink-0 shadow-xs active:scale-90 transition-transform cursor-pointer"
        title={isPlaying ? "Jeda" : "Putar suara"}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
      </button>

      {/* Waveform / Scrubber Bar */}
      <div className="flex-1 flex flex-col justify-center space-y-1 min-w-0">
        {/* Animated Waveform Visualizer */}
        <div className="flex items-center gap-[3px] h-5 px-1 overflow-hidden">
          {[40, 70, 30, 90, 60, 45, 85, 100, 50, 75, 35, 65, 95, 80, 55, 30, 70, 90, 40].map((h, i) => {
            const isPlayed = (i / 19) * 100 <= progressPercent;
            return (
              <div
                key={i}
                style={{
                  height: `${h}%`,
                  animationDuration: isPlaying ? `${0.4 + (i % 5) * 0.15}s` : "0s",
                }}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPlaying ? "animate-pulse" : ""
                } ${
                  isPlayed
                    ? "bg-[#b80035]"
                    : "bg-[#e5bdbe]/60"
                }`}
              />
            );
          })}
        </div>

        {/* Progress Slider & Timestamps */}
        <div className="flex items-center justify-between text-[10px] font-semibold text-[#5c3f40] px-0.5">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1 opacity-70">
            <Volume2 className="w-3 h-3 text-[#b80035]" />
            <span>{formatTime(duration || currentTime)}</span>
          </div>
        </div>

        {/* Hidden clickable range for precise seeking */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-transparent cursor-pointer appearance-none accent-[#b80035] -mt-1 opacity-0 hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
}
