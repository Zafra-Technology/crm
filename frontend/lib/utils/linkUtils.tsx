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
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <a
              key={index}
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
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
};

