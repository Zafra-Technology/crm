import React from 'react';

// URL regex pattern - matches http, https, www., and common URL patterns
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;

/**
 * Detects URLs in text and converts them to clickable links
 */
export const detectLinks = (text: string): Array<{ type: 'text' | 'link'; content: string; url?: string }> => {
  if (!text) return [{ type: 'text', content: text }];
  
  const parts: Array<{ type: 'text' | 'link'; content: string; url?: string }> = [];
  let lastIndex = 0;
  let match;
  
  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0;
  
  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    
    // Process the URL
    let url = match[0];
    let href = url;
    
    // Add protocol if missing
    if (url.startsWith('www.')) {
      href = 'https://' + url;
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Check if it looks like a domain (has a TLD)
      if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(url)) {
        href = 'https://' + url;
      } else {
        // Not a valid URL, treat as text
        parts.push({ type: 'text', content: url });
        lastIndex = match.index + match[0].length;
        continue;
      }
    }
    
    // Clean up URL (remove trailing punctuation that's not part of the URL)
    const cleanUrl = url.replace(/[.,!?;:]$/, '');
    const trailingPunct = url.length > cleanUrl.length ? url.slice(cleanUrl.length) : '';
    
    parts.push({ 
      type: 'link', 
      content: cleanUrl,
      url: href.replace(/[.,!?;:]$/, '')
    });
    
    // Add trailing punctuation as text
    if (trailingPunct) {
      parts.push({ type: 'text', content: trailingPunct });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
};

/**
 * Component to render text with clickable links
 */
export const LinkifiedText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const parts = detectLinks(text);

  // Helper to render mentions inside a plain text chunk
  const renderMentionsInside = (chunk: string, keyPrefix: string) => {
    // Match tokens beginning with @, stopping at whitespace or punctuation
    // Prefer matching mentions that were inserted by our input: they end with a
    // zero-width space (\u200b). This guarantees we don't over-highlight text after it.
    const DELIMITED_MENTION = /@(?:[A-Za-z0-9][A-Za-z0-9._\-]*)(?:\s+(?:[A-Za-z0-9][A-Za-z0-9._\-]*))*(?=\u200b)/g;
    // Fallback for legacy messages (no delimiter). Conservative: allow up to 2 words max
    // and stop at the first whitespace/punctuation boundary.
    const LEGACY_MENTION = /@(?:[A-Za-z0-9][A-Za-z0-9._\-]*)(?:\s+(?:[A-Za-z0-9][A-Za-z0-9._\-]*)){0,1}(?=\s|$|[.,!?;:])/g;
    const nodes: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    // First, match all delimited mentions; then, if none found, try legacy.
    let regex: RegExp = DELIMITED_MENTION;
    regex.lastIndex = 0;
    while ((m = regex.exec(chunk)) !== null) {
      if (m.index > last) {
        nodes.push(<span key={`${keyPrefix}-t-${last}`}>{chunk.slice(last, m.index)}</span>);
      }
      const mentionText = m[0];
      nodes.push(
        <span key={`${keyPrefix}-m-${m.index}`} className="text-blue-700 bg-blue-100 rounded px-1 py-0.5">
          {mentionText}
        </span>
      );
      last = m.index + mentionText.length;
    }
    if (last === 0) {
      // No delimited mentions found; try legacy pattern once
      regex = LEGACY_MENTION;
      regex.lastIndex = 0;
      while ((m = regex.exec(chunk)) !== null) {
        if (m.index > last) {
          nodes.push(<span key={`${keyPrefix}-lt-${last}`}>{chunk.slice(last, m.index)}</span>);
        }
        const mentionText = m[0];
        nodes.push(
          <span key={`${keyPrefix}-lm-${m.index}`} className="text-blue-700 bg-blue-100 rounded px-1 py-0.5">
            {mentionText}
          </span>
        );
        last = m.index + mentionText.length;
      }
    }
    if (last < chunk.length) {
      nodes.push(<span key={`${keyPrefix}-t-end`}>{chunk.slice(last)}</span>);
    }
    return nodes;
  };

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <a
              key={`l-${index}`}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part.content}
            </a>
          );
        }
        // Plain text: further split to highlight mentions
        return <React.Fragment key={`p-${index}`}>{renderMentionsInside(part.content, String(index))}</React.Fragment>;
      })}
    </span>
  );
};

