/**
 * Content script injected on supported listing pages.
 *
 * - Shows a floating "Add to TrouveTonToit" button
 * - Responds to EXTRACT messages from the popup/service-worker
 */

(function () {
  'use strict';

  const EXTRACTORS = [
    typeof extractLeBonCoin !== 'undefined' ? extractLeBonCoin : null,
    typeof extractSeLoger !== 'undefined' ? extractSeLoger : null,
    typeof extractPAP !== 'undefined' ? extractPAP : null,
    typeof extractIAD !== 'undefined' ? extractIAD : null,
  ].filter(Boolean);

  function getExtractor() {
    return EXTRACTORS.find(e => e.canHandle()) || null;
  }

  function doExtract() {
    const extractor = getExtractor();
    if (!extractor) return null;
    try {
      return extractor.extract();
    } catch (err) {
      console.error('[TTT] Extraction error:', err);
      return null;
    }
  }

  // ── Respond to messages from popup/service-worker ──

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT') {
      try {
        const data = doExtract();
        sendResponse(data ? { success: true, data } : { success: false });
      } catch (err) {
        try { sendResponse({ success: false, error: err.message }); } catch (_) {}
      }
    }
    return true;
  });

  // ── Floating button ────────────────────────────────

  function injectButton() {
    if (document.getElementById('ttt-fab')) return;
    if (!getExtractor()) return;

    const btn = document.createElement('button');
    btn.id = 'ttt-fab';
    btn.title = 'Ajouter à TrouveTonToit';
    btn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span>TTT</span>
    `;

    btn.addEventListener('click', () => {
      // Open the extension popup (user needs to click the toolbar icon)
      // As a fallback, we trigger extraction and show a visual cue
      btn.classList.add('ttt-fab--pulse');
      setTimeout(() => btn.classList.remove('ttt-fab--pulse'), 600);

      // Notify to open popup
      chrome.runtime.sendMessage({ type: 'FAB_CLICKED' });
    });

    document.body.appendChild(btn);
  }

  // Inject after a short delay so the page finishes rendering
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectButton, 800));
  } else {
    setTimeout(injectButton, 800);
  }
})();
