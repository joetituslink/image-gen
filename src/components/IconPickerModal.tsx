import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { DynamicLucideIcon } from "@/components/DynamicLucideIcon";
import { curatedLucideIcons } from "../../shared/iconCatalog.js";

interface IconPickerModalProps {
  onClose: () => void;
  onSelect: (iconName: string) => void;
  open: boolean;
  selectedIcon: string;
}

const indexedIcons = curatedLucideIcons.map((icon) => ({
  ...icon,
  searchText: `${icon.label} ${icon.name} ${icon.tags.join(" ")}`.toLowerCase(),
}));

export function IconPickerModal({
  onClose,
  onSelect,
  open,
  selectedIcon,
}: IconPickerModalProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const filteredIcons = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return indexedIcons;
    return indexedIcons.filter((icon) => icon.searchText.includes(query));
  }, [deferredSearch]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close icon picker"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="border-b border-slate-700 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Choose an icon</h2>
              <p className="mt-1 text-sm text-slate-400">
                Search a curated Lucide set built for fast selection.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Close
            </button>
          </div>
          <Input
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => setSearch(value));
            }}
            placeholder="Search icons by name or tag"
            className="mt-4 bg-slate-950/70 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredIcons.map((icon) => (
              <button
                key={icon.name}
                type="button"
                onClick={() => {
                  onSelect(icon.name);
                  onClose();
                }}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedIcon === icon.name
                    ? "border-white bg-slate-800 text-white"
                    : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800">
                  <DynamicLucideIcon
                    name={icon.name}
                    className="h-6 w-6 text-white"
                  />
                </div>
                <div className="mt-3">
                  <div className="text-sm font-medium">{icon.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{icon.tags[0]}</div>
                </div>
              </button>
            ))}
          </div>
          {filteredIcons.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center text-sm text-slate-400">
              No icons matched your search.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
