import React, { useState, useRef, useEffect } from "react";
import { formatTime } from "../services/utils";
import Visualizer from "./Visualizer";
import { PlayMode } from "../types";

interface ControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  title: string;
  artist: string;
  audioRef: React.RefObject<HTMLAudioElement>;
  onNext: () => void;
  onPrev: () => void;
  playMode: PlayMode;
  onToggleMode: () => void;
  onTogglePlaylist: () => void;
  accentColor: string;
}

const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
  title,
  artist,
  audioRef,
  onNext,
  onPrev,
  playMode,
  onToggleMode,
  onTogglePlaylist,
  accentColor,
}) => {
  const [showVolume, setShowVolume] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const volumeContainerRef = useRef<HTMLDivElement>(null);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioRef]);

  // Close volume popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        volumeContainerRef.current &&
        !volumeContainerRef.current.contains(event.target as Node)
      ) {
        setShowVolume(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getModeIcon = () => {
    // Standard white colors, simplified hover
    const iconClass =
      "w-5 h-5 text-white/60 hover:text-white transition-colors";

    switch (playMode) {
      case PlayMode.LOOP_ONE:
        return (
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={iconClass}
            >
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 014-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 01-4 4H3" />
            </svg>
            <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-white text-black rounded-[2px] px-0.5 leading-none">
              1
            </span>
          </div>
        );
      case PlayMode.SHUFFLE:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
          >
            <path d="M16 3h5v5" />
            <path d="M4 20L21 3" />
            <path d="M21 16v5h-5" />
            <path d="M15 15l6 6" />
            <path d="M4 4l5 5" />
          </svg>
        );
      default: // LOOP_ALL
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
          >
            <path d="M17 2l4 4-4 4" />
            <path d="M3 11v-1a4 4 0 014-4h14" />
            <path d="M7 22l-4-4 4-4" />
            <path d="M21 13v1a4 4 0 01-4 4H3" />
          </svg>
        );
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-2 text-white select-none">
      {/* Song Info */}
      <div className="text-center mb-1 px-4">
        <h2 className="text-2xl font-bold tracking-tight drop-shadow-md line-clamp-1">
          {title}
        </h2>
        <p className="text-white/60 text-lg font-medium line-clamp-1">
          {artist}
        </p>
      </div>

      {/* Spectrum Visualizer */}
      <div className="w-full flex justify-center h-8 mb-2">
        <Visualizer audioRef={audioRef} isPlaying={isPlaying} />
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xl flex items-center gap-3 text-xs font-medium text-white/50 group/bar relative">
        <span className="w-10 text-right font-mono tracking-widest">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex-1 h-8 flex items-center cursor-pointer group">
          {/* Background Track */}
          <div className="absolute inset-x-0 h-[3px] bg-white/20 rounded-full group-hover:h-[6px] transition-all duration-200 ease-out"></div>

          {/* Active Progress */}
          <div
            className="absolute left-0 h-[3px] rounded-full group-hover:h-[6px] transition-all duration-200 ease-out"
            style={{
              width: `${(currentTime / (duration || 1)) * 100}%`,
              backgroundColor: "rgba(255,255,255,0.9)",
            }}
          ></div>

          {/* Input Range */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
        </div>

        <span className="w-10 font-mono tracking-widest">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls Row - Flattened for Equal Spacing */}
      {/* Layout: [Mode] [Vol] [Prev] [Play] [Next] [Like] [List] */}
      <div className="w-full max-w-[380px] mt-6 px-2">
        <div className="flex items-center justify-between w-full">
          {/* 1. Play Mode */}
          <button
            onClick={onToggleMode}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Playback Mode"
          >
            {getModeIcon()}
          </button>

          {/* 2. Volume */}
          <div className="relative" ref={volumeContainerRef}>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
                showVolume ? "text-white" : "text-white/60 hover:text-white"
              }`}
              title="Volume"
            >
              {volume === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : volume < 0.5 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            {/* Volume Popup */}
            {showVolume && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-10 h-28 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 flex flex-col items-center justify-center shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 p-2 pb-3 z-50">
                <div className="relative flex-1 w-[4px] bg-white/20 rounded-full mb-2 overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full bg-white rounded-full"
                    style={{ height: `${volume * 100}%` }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ WebkitAppearance: "slider-vertical" } as any}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Previous */}
          <button
            onClick={onPrev}
            className="text-white hover:text-white/70 transition-colors"
            aria-label="Previous"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M5.75 6a.75.75 0 0 0-.75.75v10.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V6.75a.75.75 0 0 0-.75-.75h-1.5z" />
              <path d="M10.23 12.87l7.64 5.35c.74.52 1.76-.01 1.76-.91V6.69c0-.9-1.02-1.43-1.76-.91l-7.64 5.35a1.11 1.11 0 0 0 0 1.74z" />
            </svg>
          </button>

          {/* 4. Play/Pause (Center) - Animated SVG */}
          <button
            onClick={onPlayPause}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors group/play"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-7 h-7"
              style={{ marginLeft: isPlaying ? 0 : '2px' }}
            >
              {isPlaying ? (
                <>
                  {/* Pause - Two rounded rectangles with animation */}
                  <rect
                    x="6"
                    y="5"
                    width="4"
                    height="14"
                    rx="2"
                    className="origin-center"
                    style={{
                      animation: 'playToPause 0.3s ease-out forwards'
                    }}
                  />
                  <rect
                    x="14"
                    y="5"
                    width="4"
                    height="14"
                    rx="2"
                    className="origin-center"
                    style={{
                      animation: 'playToPause 0.3s ease-out forwards'
                    }}
                  />
                </>
              ) : (
                <>
                  {/* Play - Rounded triangle with animation */}
                  <path
                    d="M8 5.5C8 4.8 8.7 4.3 9.3 4.6L19.6 11.1C20.1 11.4 20.1 12.1 19.6 12.4L9.3 18.9C8.7 19.2 8 18.7 8 18V5.5Z"
                    className="origin-center"
                    style={{
                      animation: 'pauseToPlay 0.3s ease-out forwards'
                    }}
                  />
                </>
              )}
            </svg>
            <style>{`
              @keyframes playToPause {
                0% {
                  opacity: 0;
                  transform: scale(0.8) rotate(-90deg);
                }
                100% {
                  opacity: 1;
                  transform: scale(1) rotate(0deg);
                }
              }

              @keyframes pauseToPlay {
                0% {
                  opacity: 0;
                  transform: scale(0.8) rotate(90deg);
                }
                100% {
                  opacity: 1;
                  transform: scale(1) rotate(0deg);
                }
              }
            `}</style>
          </button>

          {/* 5. Next */}
          <button
            onClick={onNext}
            className="text-white hover:text-white/70 transition-colors"
            aria-label="Next"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M13.77 11.13l-7.64-5.35C5.39 5.26 4.37 5.79 4.37 6.69v10.62c0 .9 1.02 1.43 1.76.91l7.64-5.35a1.11 1.11 0 0 0 0-1.74z" />
              <path d="M18.25 6a.75.75 0 0 0-.75.75v10.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V6.75a.75.75 0 0 0-.75-.75h-1.5z" />
            </svg>
          </button>

          {/* 6. Like */}
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
              isLiked ? "text-rose-500" : "text-white/60 hover:text-white"
            }`}
            title="Like"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* 7. Playlist/Queue */}
          <button
            onClick={onTogglePlaylist}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            title="Queue"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Controls;
