import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { mainTextFontOptions } from "../../shared/fontCatalog.js";

interface FontDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export function FontDropdown({ value, onChange }: FontDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedFont = useMemo(
    () => mainTextFontOptions.find((font) => font.family === value) ?? mainTextFontOptions[0],
    [value]
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left text-white transition hover:border-slate-500"
      >
        <div>
          <div style={{ fontFamily: selectedFont.family, fontWeight: 700 }}>
            {selectedFont.label}
          </div>
          <div className="mt-1 text-xs text-slate-500">{selectedFont.previewText}</div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-slate-950/60">
          {mainTextFontOptions.map((font) => (
            <button
              key={font.id}
              type="button"
              onClick={() => {
                onChange(font.family);
                setOpen(false);
              }}
              className={`w-full rounded-xl px-4 py-3 text-left transition ${
                font.family === value
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div style={{ fontFamily: font.family, fontWeight: 700 }}>{font.label}</div>
              <div
                className="mt-1 text-xs text-slate-500"
                style={{ fontFamily: font.family, fontWeight: 700 }}
              >
                {font.previewText}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
