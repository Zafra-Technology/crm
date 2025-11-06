'use client';

import { useState, useEffect } from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface UtilityWebsiteCardProps {
  url: string;
}

export default function UtilityWebsiteCard({ url }: UtilityWebsiteCardProps) {
  const [websiteData, setWebsiteData] = useState<{
    title?: string;
    description?: string;
    thumbnail?: string;
  } | null>(null);
  const [imageError, setImageError] = useState(false);

  // Extract domain name from URL for display
  const getDomainName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      // Format as title case
      return hostname
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    } catch {
      return url;
    }
  };

  // Generate a simple thumbnail URL (using a service like screenshot API or favicon)
  const getThumbnailUrl = (url: string): string | undefined => {
    try {
      const urlObj = new URL(url);
      // Use favicon service - you can also use screenshot services like:
      // - https://api.screenshotmachine.com
      // - https://www.googleapis.com/pagespeedonline/v5/runPagespeed
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    // Try to fetch website metadata
    const fetchMetadata = async () => {
      if (!url) return;
      
      try {
        // For now, we'll just use the URL and domain name
        // In production, you might want to use a service to fetch Open Graph data
        // or create a backend endpoint that fetches website metadata
        setWebsiteData({
          title: getDomainName(url),
          description: url,
          thumbnail: getThumbnailUrl(url),
        });
      } catch (error) {
        console.error('Error fetching website metadata:', error);
      }
    };

    fetchMetadata();
  }, [url]);

  const domainName = getDomainName(url);
  const thumbnailUrl = getThumbnailUrl(url);
  const displayTitle = websiteData?.title || domainName;

  return (
    <Card className="p-3 hover:shadow-md transition-shadow bg-white">
      <div className="flex gap-3">
        {/* Thumbnail - Compact size */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 border border-border rounded bg-muted flex items-center justify-center overflow-hidden">
            {thumbnailUrl && !imageError ? (
              <img
                src={thumbnailUrl}
                alt={displayTitle}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <Globe className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-1">
            {/* Title - Bold and prominent */}
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
              {displayTitle}
            </h3>
            
            {/* URL - Clickable link */}
            <div className="flex items-center gap-1">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 break-all"
              >
                <span className="truncate">{url}</span>
                <ExternalLink size={12} className="flex-shrink-0" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

