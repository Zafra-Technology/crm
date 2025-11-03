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
  multiline?: boolean;
  innerClassName?: string; // applied to BOTH overlay and input to keep caret aligned
  liveHighlight?: boolean; // render blue mention highlighting while typing (may affect caret on some environments)
  ceHighlight?: boolean; // render highlights using contentEditable (no overlay)
}

// Lightweight input with @mention autocomplete.
// Inserts plain text like "@Full Name ". Rendering is styled elsewhere.
export default function MentionInput({ value, onChange, options, placeholder, disabled, className = '', multiline = false, innerClassName = '', liveHighlight = true, ceHighlight = false }: MentionInputProps) {
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null as any);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ceRef = useRef<HTMLDivElement>(null);
  const ceCaretOffsetRef = useRef<number | null>(null);
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
    // contentEditable mode
    if (ceHighlight && ceRef.current) {
      const caret = getCurrentCaretTextOffset();
      const start = triggerIndex != null ? triggerIndex : caret;
      const before = value.slice(0, start);
      const after = value.slice(caret);
      const mentionText = `@${opt.name}\u200b `;
      const next = before + mentionText + after;
      onChange(next);
      const newCaret = (before + mentionText).length;
      ceCaretOffsetRef.current = newCaret;
      // restore caret on next effect after DOM update
      setOpen(false);
      setTriggerIndex(null);
      setQuery('');
      return;
    }
    if (!inputRef.current) return;
    const el = inputRef.current as any;
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

  // Autosize for multiline
  useEffect(() => {
    if (!multiline || !inputRef.current) return;
    const ta = inputRef.current as any;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [value, multiline]);

  // Keep overlay aligned with the caret by mirroring scroll offsets
  useEffect(() => {
    const el = inputRef.current as any;
    if (!el) return;
    const sync = () => {
      const sl = el.scrollLeft || 0;
      const st = el.scrollTop || 0;
      if (overlayRef.current) overlayRef.current.style.transform = (sl || st) ? `translate(${-sl}px, ${-st}px)` : 'translate(0, 0)';
    };
    // Initial sync and on events
    sync();
    el.addEventListener('scroll', sync);
    el.addEventListener('input', sync);
    window.addEventListener('resize', sync);
    return () => {
      el.removeEventListener('scroll', sync);
      el.removeEventListener('input', sync);
      window.removeEventListener('resize', sync);
    };
  }, [multiline, value]);

  // ----- contentEditable (overlay-free) caret helpers -----
  const getCurrentCaretTextOffset = () => {
    const root = ceRef.current;
    if (!root) return value.length;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return value.length;
    const range = sel.getRangeAt(0);
    let offset = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const n = walker.currentNode as Text;
      if (n === range.startContainer) {
        offset += range.startOffset;
        break;
      }
      offset += n.nodeValue?.length || 0;
    }
    return offset;
  };

  const setCaretByTextOffset = (textOffset: number) => {
    const root = ceRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel) return;
    let remaining = textOffset;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let found: Text | null = null;
    while (walker.nextNode()) {
      const n = walker.currentNode as Text;
      const len = n.nodeValue?.length || 0;
      if (remaining <= len) { found = n; break; }
      remaining -= len;
    }
    if (!found) return;
    const range = document.createRange();
    range.setStart(found, Math.max(0, remaining));
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const handleCEInput = () => {
    if (!ceRef.current) return;
    const text = ceRef.current.innerText.replace(/\u200b/g, '');
    ceCaretOffsetRef.current = getCurrentCaretTextOffset();
    onChange(text);
  };

  // Re-apply highlighted HTML and caret after value updates
  useEffect(() => {
    if (!ceHighlight || !ceRef.current) return;
    const root = ceRef.current;
    const html = highlightedHtml || '';
    if (root.innerHTML !== html) {
      root.innerHTML = html;
    }
    if (ceCaretOffsetRef.current != null) {
      setCaretByTextOffset(ceCaretOffsetRef.current);
    }
  }, [highlightedHtml, ceHighlight]);

  if (ceHighlight) {
    return (
      <div className={`relative w-full ${className}`}>
        <div
          ref={ceRef}
          contentEditable={!disabled}
          role="textbox"
          aria-multiline={multiline ? 'true' : 'false'}
          spellCheck={false}
          className={`flex-1 outline-none text-sm leading-5 font-normal tracking-normal w-full ${multiline ? 'min-h-[2.25rem]' : 'h-[2.25rem]'} bg-transparent caret-black relative z-10 text-gray-900 font-sans ${innerClassName}`}
          onInput={handleCEInput}
          onKeyDown={handleKeyDown as any}
          data-placeholder={placeholder}
          style={{ whiteSpace: multiline ? 'pre-wrap' : 'pre', overflowWrap: 'anywhere' } as any}
          suppressContentEditableWarning
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

  return (
    <div className={`relative w-full ${className}`}>
      {/* Highlighter overlay below the input text */}
      {liveHighlight && (
        <div
          ref={overlayRef}
          className={`absolute inset-0 pointer-events-none ${multiline ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap overflow-hidden'} text-sm leading-5 font-normal tracking-normal text-gray-900 z-0 font-sans ${innerClassName}`}
          style={{ fontVariantLigatures: 'none', boxSizing: 'border-box', willChange: 'transform', wordBreak: 'break-word', overflowWrap: 'anywhere', userSelect: 'none' } as any}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlightedHtml || '' }}
        />
      )}
      {multiline ? (
        <textarea
          ref={inputRef as any}
          value={value}
          onChange={handleChange as any}
          onKeyDown={handleKeyDown as any}
          placeholder={placeholder}
          rows={1}
          className={`flex-1 outline-none text-sm leading-5 font-normal tracking-normal w-full resize-none bg-transparent caret-black relative z-10 ${liveHighlight ? 'text-transparent placeholder:text-transparent' : 'text-gray-900'} font-sans ${innerClassName}`}
          style={{ fontVariantLigatures: 'none', wordBreak: 'break-word', overflowWrap: 'anywhere' } as any}
          spellCheck={liveHighlight ? false : undefined}
          disabled={disabled}
        />
      ) : (
        <input
          ref={inputRef as any}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 outline-none text-sm leading-5 font-normal tracking-normal w-full bg-transparent caret-black relative z-10 ${liveHighlight ? 'text-transparent placeholder:text-transparent' : 'text-gray-900'} font-sans ${innerClassName}`}
          style={{ fontVariantLigatures: 'none', wordBreak: 'break-word', overflowWrap: 'anywhere' } as any}
          spellCheck={liveHighlight ? false : undefined}
          disabled={disabled}
        />
      )}

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


