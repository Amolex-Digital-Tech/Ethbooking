"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";

type Destination = { name: string; type: string; propertyCount: number };
type DestinationAutocompleteProps = { initialValue?: string; initialType?: string; suggestions?: string[]; onValueChange?: (value: string) => void; onTypeChange?: (type: string) => void };

export default function DestinationAutocomplete({ initialValue = "", initialType = "", suggestions = [], onValueChange, onTypeChange }: DestinationAutocompleteProps) {
  const [value, setValue] = useState(initialValue);
  const [selectedType, setSelectedType] = useState(initialType);
  const [items, setItems] = useState<Destination[]>(suggestions.map((name) => ({ name, type: "Destination", propertyCount: 0 })));
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/destinations?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal });
        const result = await response.json();
        if (response.ok && result.success) setItems(result.data);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value, isOpen]);

  const matches = items.slice(0, 10);
  function selectDestination(destination: Destination) {
    setValue(destination.name);
    onValueChange?.(destination.name);
    setSelectedType(destination.type);
    onTypeChange?.(destination.type);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input type="hidden" name="destinationType" value={selectedType} />
      <div className="flex min-h-[54px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100">
        <MapPin size={19} className="shrink-0 text-slate-400" />
        <input
          id="destination" name="destination" type="search" value={value}
          placeholder="Where do you want to go?" autoComplete="off" role="combobox"
          aria-autocomplete="list" aria-expanded={isOpen} aria-controls="destination-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `destination-option-${activeIndex}` : undefined}
          onFocus={() => setIsOpen(true)} onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
          onChange={(event) => { setValue(event.target.value); setSelectedType(""); onValueChange?.(event.target.value); onTypeChange?.(""); setIsOpen(true); setActiveIndex(-1); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && matches.length) { event.preventDefault(); setActiveIndex((v) => (v + 1) % matches.length); }
            if (event.key === "ArrowUp" && matches.length) { event.preventDefault(); setActiveIndex((v) => (v <= 0 ? matches.length - 1 : v - 1)); }
            if (event.key === "Enter" && isOpen && activeIndex >= 0 && matches[activeIndex]) { event.preventDefault(); selectDestination(matches[activeIndex]); }
            if (event.key === "Escape") setIsOpen(false);
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {value && <button type="button" aria-label="Clear destination" onClick={() => { setValue(""); setSelectedType(""); onValueChange?.(""); onTypeChange?.(""); }} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>}
      </div>
      {isOpen && (
        <div id="destination-suggestions" role="listbox" aria-label="Destination suggestions" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{value.trim() ? "Matching destinations" : "Destinations"}</p>
          {loading && <p className="px-3 py-2 text-xs text-slate-400">Finding destinations…</p>}
          {matches.length ? matches.map((item, index) => (
            <button key={`${item.type}-${item.name}`} id={`destination-option-${index}`} type="button" role="option" aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()} onClick={() => selectDestination(item)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${index === activeIndex ? "bg-lime-50" : "hover:bg-slate-50"}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><MapPin size={16} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{item.name}</span><span className="block text-xs text-slate-400">{item.type}</span></span>
              <span className="text-right text-xs text-slate-400">{item.propertyCount ? `${item.propertyCount} properties` : "Coming soon · 0 properties"}</span>
            </button>
          )) : !loading && <p className="px-3 py-4 text-sm text-slate-500">No matching saved destination. You can still search for “{value}”.</p>}
        </div>
      )}
    </div>
  );
}
