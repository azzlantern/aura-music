import React, { useState } from "react";
import GlassDialog from "../glass/GlassDialog";
import { useI18n } from "../hooks/useI18n";

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
  const { dict } = useI18n();
  const [importUrl, setImportUrl] = useState("");
  const [mode, setMode] = useState<"id" | "url">("id");
  const [isLoading, setIsLoading] = useState(false);

  // A bare number is a Netease playlist id, but the link parser needs a URL.
  const resolve = (input: string) =>
    mode === "id" && /^\d+$/.test(input)
      ? `https://music.163.com/#/playlist?id=${input}`
      : input;

  const handleImport = async () => {
    const input = importUrl.trim();
    if (!input || isLoading) return;

    setIsLoading(true);
    try {
      const success = await onImport(resolve(input));
      if (success) {
        setImportUrl("");
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setImportUrl("");
    onClose();
  };

  const tabs = [
    { id: "id" as const, label: dict.import.tabId },
    { id: "url" as const, label: dict.import.tabUrl },
  ];
  const hint = mode === "id" ? dict.import.placeholderId : dict.import.placeholder;

  return <GlassDialog open={isOpen} onClose={handleClose} title={dict.import.title}>
    <div className="glass-dialog-body">
      <h2>{dict.import.title}</h2>
      <p className="glass-description mt-2">{dict.import.hintStart} <strong>{dict.import.hintBrand}</strong> {dict.import.hintEnd}</p>
      {/* Same segmented control as the search panel: recessed track, raised segment. */}
      <div className="relative isolate flex items-center mt-5 p-[2px] rounded-[9px] bg-black/25 shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.06)]">
        <div
          className="absolute top-[2px] bottom-[2px] rounded-[7px] bg-white/[0.16] shadow-[0_1px_1px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.14),inset_0_0.5px_0_rgba(255,255,255,0.3)] transition-[left] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ left: mode === "id" ? 2 : "50%", width: "calc(50% - 2px)" }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={mode === tab.id}
            onClick={() => setMode(tab.id)}
            className={`relative z-10 flex-1 py-1.5 rounded-[7px] text-sm font-medium transition-colors ${mode === tab.id ? "text-white" : "text-white/55 hover:text-white/80"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <input type="text" className="glass-input mt-3" value={importUrl}
        onChange={(event) => setImportUrl(event.target.value)} placeholder={hint}
        aria-label={hint} disabled={isLoading} autoFocus
        onKeyDown={(event) => { if (event.key === "Enter") void handleImport(); }} />
    </div>
    <div className="glass-dialog-actions">
      <button className="glass-button" onClick={handleClose}>{dict.import.cancel}</button>
      <button className="glass-button glass-primary" disabled={isLoading || !importUrl.trim()} onClick={handleImport}>
        {isLoading ? dict.import.loading : dict.import.action}
      </button>
    </div>
  </GlassDialog>;
};
export default ImportMusicDialog;