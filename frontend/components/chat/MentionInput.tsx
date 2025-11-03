'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type MentionOption = {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
};

interface MentionInputProps {
  value: string;
  onChange: (val: string) => void;
  options: MentionOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Lightweight input with @mention autocomplete.
// Inserts plain text like "@Full Name ". Rendering is styled elsewhere.
export default function MentionInput({ value, onChange, options, placeholder, disabled, className = '' }: MentionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null);
  
  // Build highlighted HTML for live typing preview
  const highlightedHtml = useMemo(() => {
    const escapeHtml = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const text = escapeHtml(value || '');
    if (!text) {
      return escapeHtml(placeholder || '');
    }
    const DELIMITED = /@(?:[A-Za-z0-9][A-Za-z0-9._\-]*)(?:\s+(?:[A-Za-z0-9][A-Za-z0-9._\-]*))*(?=\u200b)/g;
    const LEGACY = /@(?:[A-Za-z0-9][A-Za-z0-9._\-]*)(?:\s+(?:[A-Za-z0-9][A-Za-z0-9._\-]*)){0,1}(?=\s|$|[.,!?;:])/g;
    // IMPORTANT: Do not add horizontal padding; it would desync overlay width vs input and misplace the caret
    const wrap = (str: string, rx: RegExp) => str.replace(rx, (m) => `<span class=\"text-blue-700 bg-blue-100 rounded\">${m}</span>`);
    let html = wrap(text, DELIMITED);
    if (html === text) {
      html = wrap(text, LEGACY);
    }
    return html;
  }, [value]);

  // Filter options based on current query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter(o => (o.name || '').toLowerCase().includes(q)).slice(0, 8);
  }, [options, query]);

  // Detect mention context on every change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);

    const caret = e.target.selectionStart ?? text.length;
    // Find the start of the word preceding the caret
    let atPos = -1;
    for (let i = caret - 1; i >= 0; i--) {
      const ch = text[i];
      if (ch === '@') { atPos = i; break; }
      if (ch === ' ' || ch === '\n' || ch === '\t') break; // stop on whitespace
    }

    if (atPos >= 0) {
      const typed = text.slice(atPos + 1, caret);
      // If no space and no line break since '@', treat as mention
      if (/^[^\s@]{0,50}$/.test(typed)) {
        setTriggerIndex(atPos);
        setQuery(typed);
        setOpen(true);
        setActiveIndex(0);
        return;
      }
    }

    setOpen(false);
    setTriggerIndex(null);
    setQuery('');
  };

  const insertMention = (opt: MentionOption) => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    const caret = el.selectionStart ?? value.length;
    const start = triggerIndex != null ? triggerIndex : caret;
    const before = value.slice(0, start);
    const after = value.slice(caret);
    // Insert a zero-width space after the mention as a delimiter so rendering
    // can precisely highlight only the mention portion.
    const mentionText = `@${opt.name}\u200b `;
    const next = before + mentionText + after;
    onChange(next);
    // move caret to end of inserted mention
    const newCaret = (before + mentionText).length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
    });
    setOpen(false);
    setTriggerIndex(null);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filtered[activeIndex]) {
        e.preventDefault();
        insertMention(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Close popup if options list becomes empty
  useEffect(() => {
    if (open && filtered.length === 0) setActiveIndex(0);
  }, [open, filtered.length]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Highlighter overlay below the input text */}
      <div
        className="absolute inset-0 pointer-events-none whitespace-pre-wrap text-sm text-gray-900 z-0 px-0"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlightedHtml || '' }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 outline-none text-sm w-full bg-transparent caret-black relative z-10 text-transparent placeholder:text-transparent"
        disabled={disabled}
      />

      {open && filtered.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 right-0 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg z-20">
          {filtered.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 ${idx === activeIndex ? 'bg-gray-100' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); insertMention(opt); }}
            >
              {opt.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opt.avatar} alt={opt.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">{opt.name?.[0]?.toUpperCase() || '?'}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 truncate">{opt.name}</div>
                {opt.role && <div className="text-[11px] text-gray-500 truncate">{opt.role}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


