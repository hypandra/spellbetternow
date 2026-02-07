'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';

interface ShareButtonProps {
  sessionId: string;
}

export default function ShareButton({ sessionId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/share/${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-spelling-border bg-spelling-surface text-spelling-text hover:bg-spelling-surface-muted transition-colors text-sm"
    >
      <Share2 className="h-4 w-4" />
      {copied ? 'Link copied!' : 'Share results'}
    </button>
  );
}
