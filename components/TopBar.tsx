import React, { useRef } from "react";
import { AuraLogo } from "./Icons";

interface TopBarProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ onFilesSelected, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = "";
  };

  return (
    <div className="fixed top-0 left-0 w-full h-14 z-[60] group">
      {/* Blur Background Layer (Animate in) */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl border-b border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

      {/* Content (Animate in) */}
      <div className="relative z-10 w-full h-full px-6 flex justify-between items-center opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 transition-all duration-500 delay-75">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-[8px] shadow-lg shadow-purple-500/20 overflow-hidden">
            <AuraLogo className="w-full h-full" />
          </div>
          <h1 className="text-white/90 font-bold tracking-wider text-sm uppercase hidden sm:block">
            Aura Music
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import Files
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*,.lrc,.txt"
            multiple
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
