import React, { useState } from "react";
import { createPortal } from "react-dom";
import { LinkIcon } from "./Icons";

interface ImportMusicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string) => Promise<boolean>;
}

const ImportMusicDialog: React.FC<ImportMusicDialogProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [importInput, setImportInput] = useState("");
  const [inputType, setInputType] = useState<"url" | "id">("id");
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    if (!importInput.trim() || isLoading) return;

    setIsLoading(true);
    try {
      let finalUrl = importInput.trim();
      
      // 如果是ID模式，构造完整的网易云音乐歌单URL
      if (inputType === "id") {
        // 检查是否只是纯数字ID
        if (/^\d+$/.test(finalUrl)) {
          finalUrl = `https://music.163.com/#/playlist?id=${finalUrl}`;
        }
      }
      
      const success = await onImport(finalUrl);
      if (success) {
        setImportInput("");
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setImportInput("");
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"></div>

      {/* Modal */}
      <div
        className="relative w-full max-w-[360px] bg-black/20 backdrop-blur-[80px] saturate-150 border border-white/10 rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 scale-100 ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
            <LinkIcon className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight">
            导入网易云音乐
          </h3>
          <p className="text-white/60 text-[15px] mt-2 leading-relaxed px-2">
            输入网易云音乐{" "}
            <span className="text-white/90 font-medium">
              歌单ID或完整链接
            </span>{" "}
            来添加到播放队列
          </p>

          {/* 输入类型切换 */}
          <div className="flex mt-4 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setInputType("id")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                inputType === "id"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              歌单ID
            </button>
            <button
              onClick={() => setInputType("url")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                inputType === "url"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              完整链接
            </button>
          </div>

          <input
            type="text"
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            placeholder={
              inputType === "id" 
                ? "例如: 123456789" 
                : "https://music.163.com/..."
            }
            className="w-full mt-3 bg-white/10 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all text-[15px]"
            disabled={isLoading}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleImport();
              }
            }}
          />
          
          {inputType === "id" && (
            <p className="text-white/40 text-xs mt-2 px-1">
              提示：在网易云音乐歌单页面URL中找到数字ID，例如 music.163.com/#/playlist?id=<span className="text-blue-400">123456789</span>
            </p>
          )}
        </div>

        {/* Action Buttons (iOS Style) */}
        <div className="grid grid-cols-2 border-t border-white/10 divide-x divide-white/10 bg-white/5">
          <button
            onClick={handleClose}
            className="py-4 text-[17px] text-white/60 font-medium hover:bg-white/5 transition-colors active:bg-white/10"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading}
            className={`py-4 text-[17px] font-semibold transition-colors flex items-center justify-center gap-2 ${isLoading
                ? "text-white/40 cursor-not-allowed"
                : "text-blue-400 hover:bg-white/5 active:bg-white/10"
              }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>导入中...</span>
              </>
            ) : (
              "导入"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ImportMusicDialog;
