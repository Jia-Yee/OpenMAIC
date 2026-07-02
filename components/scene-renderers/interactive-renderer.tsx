'use client';

import { useMemo } from 'react';
import type { InteractiveContent } from '@/lib/types/stage';

interface InteractiveRendererProps {
  readonly content: InteractiveContent;
  readonly mode: 'autonomous' | 'playback';
  readonly sceneId: string;
}

export function InteractiveRenderer({ content, mode: _mode, sceneId }: InteractiveRendererProps) {
  const patchedHtml = useMemo(
    () => (content.html ? patchHtmlForIframe(content.html) : undefined),
    [content.html],
  );

  return (
    <div className="w-full h-full relative">
      <iframe
        srcDoc={patchedHtml}
        src={patchedHtml ? undefined : content.url}
        className="absolute inset-0 w-full h-full border-0"
        title={`Interactive Scene ${sceneId}`}
        sandbox="allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}

/**
 * Patch embedded HTML to display correctly inside an iframe.
 *
 * Fixes:
 * - min-h-screen / h-screen → use 100% of iframe viewport
 * - Ensure html/body fill the iframe with no overflow issues
 * - Canvas elements use container sizing instead of viewport
 * - Global error handler to catch and log AI-generated code errors
 * - CSP meta tag to allow inline styles and fonts
 */
function patchHtmlForIframe(html: string): string {
  const iframePatch = `<style data-iframe-patch>
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }
  /* Fix min-h-screen: in iframes 100vh is the iframe height, which is correct,
     but ensure body actually fills it */
  body { min-height: 100vh; }
</style>
<meta http-equiv="Content-Security-Policy" content="font-src 'self' data: https: about:; style-src 'unsafe-inline' 'self' data:; script-src 'unsafe-inline' 'self' 'unsafe-eval' data:;">
<script data-iframe-patch>
// Global error handler for AI-generated interactive content
window.onerror = function(msg, url, line, col, error) {
  console.warn('[Interactive] Runtime error:', msg, 'at line', line);
  return true; // Prevent default error display
};
window.onunhandledrejection = function(event) {
  console.warn('[Interactive] Unhandled promise rejection:', event.reason);
};
</script>
<style>
/* Fix about:invalid font references from KaTeX */
@font-face { font-family: 'KaTeX_Main'; src: local('serif'); }
@font-face { font-family: 'KaTeX_Math'; src: local('serif'); }
@font-face { font-family: 'KaTeX_AMS'; src: local('serif'); }
</style>`;

  // Insert right after <head> or at the start of the document
  const headIdx = html.indexOf('<head>');
  if (headIdx !== -1) {
    const insertPos = headIdx + 6; // after <head>
    return html.substring(0, insertPos) + '\n' + iframePatch + html.substring(insertPos);
  }

  const headWithAttrs = html.indexOf('<head ');
  if (headWithAttrs !== -1) {
    const closeAngle = html.indexOf('>', headWithAttrs);
    if (closeAngle !== -1) {
      const insertPos = closeAngle + 1;
      return html.substring(0, insertPos) + '\n' + iframePatch + html.substring(insertPos);
    }
  }

  // Fallback: prepend
  return iframePatch + html;
}
