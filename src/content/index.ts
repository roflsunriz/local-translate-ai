/**
 * Content Script - Handles text selection and translation popup
 */

import type { ExtensionMessage } from '@/types/messages';

// Translation popup element
let translationPopup: HTMLDivElement | null = null;
let translationButton: HTMLButtonElement | null = null;

// Page translation state
const translatedNodes = new Map<string, { node: Text; originalText: string }>();

// Initialize content script
function init(): void {
  // Listen for text selection
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keyup', handleKeyUp);

  // Listen for messages from background script
  browser.runtime.onMessage.addListener(handleMessage);

  // Clean up popup on scroll/resize
  document.addEventListener('scroll', hideTranslationUI, { passive: true });
  window.addEventListener('resize', hideTranslationUI, { passive: true });

  // Inject styles for translated elements
  injectTranslationStyles();

  console.info('Local Translate AI content script loaded');
}

function injectTranslationStyles(): void {
  const style = document.createElement('style');
  style.id = 'lta-styles';
  style.textContent = `
    .lta-translated {
      position: relative;
      background-color: rgba(59, 130, 246, 0.05);
      border-bottom: 1px dotted rgba(59, 130, 246, 0.3);
    }
    .lta-translated:hover::after {
      content: attr(data-original);
      position: absolute;
      bottom: 100%;
      left: 0;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-wrap;
      max-width: 400px;
      z-index: 2147483646;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    }
    .lta-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      z-index: 2147483647;
      transition: width 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

function handleMessage(
  message: ExtensionMessage | { type: string; payload?: unknown },
): boolean | void | Promise<unknown> {
  switch (message.type) {
    case 'GET_SELECTION': {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (selectedText) {
        void browser.runtime.sendMessage({
          type: 'TRANSLATE_TEXT',
          timestamp: Date.now(),
          payload: {
            requestId: crypto.randomUUID(),
            text: selectedText,
            sourceLanguage: 'auto',
            targetLanguage: 'Japanese',
            profileId: '',
            stream: true,
          },
        });
      }
      break;
    }

    case 'TRANSLATE_PAGE':
      void startPageTranslation();
      break;

    case 'GET_PAGE_TEXT_NODES':
      return Promise.resolve(getPageTextNodes());

    case 'APPLY_PAGE_TRANSLATION': {
      const applyPayload = (message as { payload: { nodeIds: string[]; translatedTexts: string[] } }).payload;
      applyPageTranslation(applyPayload.nodeIds, applyPayload.translatedTexts);
      break;
    }

    case 'TRANSLATE_PAGE_PROGRESS': {
      const progressPayload = (message as { payload: { translatedNodes: number; totalNodes: number } }).payload;
      updateProgressBar(progressPayload.translatedNodes, progressPayload.totalNodes);
      break;
    }

    case 'TRANSLATE_TEXT_RESULT': {
      const resultPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_RESULT' }).payload;
      showTranslationResult(resultPayload.translatedText);
      break;
    }

    case 'TRANSLATE_TEXT_STREAM_CHUNK': {
      const chunkPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_STREAM_CHUNK' }).payload;
      updateStreamingResult(chunkPayload.accumulated);
      break;
    }

    case 'TRANSLATE_TEXT_STREAM_END': {
      const endPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_STREAM_END' }).payload;
      finalizeTranslationResult(endPayload.translatedText);
      break;
    }

    case 'TRANSLATE_TEXT_ERROR':
      showTranslationError((message as ExtensionMessage & { type: 'TRANSLATE_TEXT_ERROR' }).payload.message);
      break;

    default:
      // Unknown message type
      break;
  }
}

function handleMouseUp(event: MouseEvent): void {
  // Ignore if clicking on our own elements
  if (
    translationPopup?.contains(event.target as Node) ||
    translationButton?.contains(event.target as Node)
  ) {
    return;
  }

  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (selectedText && selectedText.length > 0) {
    showTranslationButton(event.clientX, event.clientY, selectedText);
  } else {
    hideTranslationUI();
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  // Check for Escape key to hide popup
  if (event.key === 'Escape') {
    hideTranslationUI();
  }
}

function showTranslationButton(x: number, y: number, text: string): void {
  hideTranslationUI();

  translationButton = document.createElement('button');
  translationButton.id = 'lta-translate-button';
  translationButton.innerHTML = '🌐 翻訳';
  translationButton.style.cssText = `
    position: fixed;
    left: ${x + 10}px;
    top: ${y + 10}px;
    z-index: 2147483647;
    padding: 8px 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: background 0.2s;
  `;

  translationButton.addEventListener('mouseenter', () => {
    if (translationButton) {
      translationButton.style.background = '#2563eb';
    }
  });

  translationButton.addEventListener('mouseleave', () => {
    if (translationButton) {
      translationButton.style.background = '#3b82f6';
    }
  });

  translationButton.addEventListener('click', () => {
    void translateSelectedText(text);
  });

  document.body.appendChild(translationButton);
}

async function translateSelectedText(text: string): Promise<void> {
  if (!translationButton) {
    return;
  }

  const buttonRect = translationButton.getBoundingClientRect();
  showTranslationPopup(buttonRect.left, buttonRect.bottom + 10);
  updateTranslationPopupContent('翻訳中...');

  const requestId = crypto.randomUUID();

  try {
    // Send to background script for translation and sidebar sync
    await browser.runtime.sendMessage({
      type: 'TRANSLATE_TEXT',
      timestamp: Date.now(),
      payload: {
        requestId,
        text,
        sourceLanguage: 'auto',
        targetLanguage: 'Japanese',
        profileId: '',
        stream: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    showTranslationError(message);
  }

  // Hide the button after clicking
  if (translationButton) {
    translationButton.remove();
    translationButton = null;
  }
}

function showTranslationPopup(x: number, y: number): void {
  if (translationPopup) {
    translationPopup.remove();
  }

  translationPopup = document.createElement('div');
  translationPopup.id = 'lta-translation-popup';
  translationPopup.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    z-index: 2147483647;
    min-width: 200px;
    max-width: 400px;
    max-height: 300px;
    padding: 16px;
    background: white;
    color: #1f2937;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    font-size: 14px;
    line-height: 1.5;
    overflow: auto;
  `;

  // Check if popup would go off screen
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (x + 400 > viewportWidth) {
    translationPopup.style.left = `${viewportWidth - 420}px`;
  }
  if (y + 300 > viewportHeight) {
    translationPopup.style.top = `${viewportHeight - 320}px`;
  }

  document.body.appendChild(translationPopup);
}

function updateTranslationPopupContent(content: string): void {
  if (!translationPopup) {
    return;
  }

  translationPopup.innerHTML = `
    <div style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(content)}</div>
  `;
}

function showTranslationResult(text: string): void {
  if (!translationPopup) {
    return;
  }

  translationPopup.innerHTML = `
    <div style="white-space: pre-wrap; word-break: break-word; margin-bottom: 12px;">${escapeHtml(text)}</div>
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="lta-copy-btn" style="
        padding: 6px 12px;
        background: #e5e7eb;
        color: #374151;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      ">コピー</button>
      <button id="lta-close-btn" style="
        padding: 6px 12px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      ">閉じる</button>
    </div>
  `;

  const copyBtn = translationPopup.querySelector('#lta-copy-btn');
  const closeBtn = translationPopup.querySelector('#lta-close-btn');

  copyBtn?.addEventListener('click', () => {
    void navigator.clipboard.writeText(text);
    if (copyBtn instanceof HTMLButtonElement) {
      copyBtn.textContent = 'コピー完了!';
      setTimeout(() => {
        copyBtn.textContent = 'コピー';
      }, 2000);
    }
  });

  closeBtn?.addEventListener('click', hideTranslationUI);
}

function updateStreamingResult(text: string): void {
  updateTranslationPopupContent(text);
}

function finalizeTranslationResult(text: string): void {
  showTranslationResult(text);
}

function showTranslationError(message: string): void {
  if (!translationPopup) {
    return;
  }

  translationPopup.innerHTML = `
    <div style="color: #dc2626; margin-bottom: 12px;">
      <strong>エラー:</strong> ${escapeHtml(message)}
    </div>
    <button id="lta-close-btn" style="
      padding: 6px 12px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    ">閉じる</button>
  `;

  const closeBtn = translationPopup.querySelector('#lta-close-btn');
  closeBtn?.addEventListener('click', hideTranslationUI);
}

function hideTranslationUI(): void {
  if (translationButton) {
    translationButton.remove();
    translationButton = null;
  }
  if (translationPopup) {
    translationPopup.remove();
    translationPopup = null;
  }
}

// Page translation functions
function getPageTextNodes(): { texts: string[]; nodeIds: string[] } {
  const texts: string[] = [];
  const nodeIds: string[] = [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        const tagName = parent.tagName.toLowerCase();
        // Skip non-translatable elements
        if (['script', 'style', 'noscript', 'code', 'pre', 'textarea', 'input'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip empty or whitespace-only nodes
        const text = node.textContent?.trim();
        if (!text || text.length === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip very short text (likely punctuation or numbers only)
        if (text.length < 2) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let nodeIndex = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node instanceof Text && node.textContent) {
      const nodeId = `lta-node-${nodeIndex++}`;
      texts.push(node.textContent.trim());
      nodeIds.push(nodeId);
      translatedNodes.set(nodeId, { node, originalText: node.textContent });
    }
  }

  return { texts, nodeIds };
}

function applyPageTranslation(nodeIds: string[], translatedTexts: string[]): void {
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    const translatedText = translatedTexts[i];
    const nodeData = translatedNodes.get(nodeId ?? '');

    if (nodeData && translatedText && nodeId) {
      const { node, originalText } = nodeData;

      // Replace text content
      node.textContent = translatedText;

      // Add wrapper span with original text for hover display
      const parent = node.parentElement;
      if (parent && !parent.classList.contains('lta-translated')) {
        parent.classList.add('lta-translated');
        parent.setAttribute('data-original', originalText);
      }
    }
  }

  removeProgressBar();

  // Show completion notification
  void browser.runtime.sendMessage({
    type: 'NOTIFICATION',
    timestamp: Date.now(),
    payload: {
      id: crypto.randomUUID(),
      notificationType: 'success',
      title: 'ページ翻訳完了',
      message: `${nodeIds.length}個のテキストを翻訳しました`,
    },
  });
}

async function startPageTranslation(): Promise<void> {
  // Show progress bar
  showProgressBar();

  // Request translation from background
  await browser.runtime.sendMessage({
    type: 'TRANSLATE_PAGE',
    timestamp: Date.now(),
    payload: {
      requestId: crypto.randomUUID(),
      targetLanguage: 'Japanese',
      profileId: '',
    },
  });
}

function showProgressBar(): void {
  let progressBar = document.getElementById('lta-progress-bar');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'lta-progress-bar';
    progressBar.className = 'lta-progress-bar';
    progressBar.style.width = '0%';
    document.body.appendChild(progressBar);
  }
}

function updateProgressBar(completed: number, total: number): void {
  const progressBar = document.getElementById('lta-progress-bar');
  if (progressBar) {
    const percent = Math.round((completed / total) * 100);
    progressBar.style.width = `${percent}%`;
  }
}

function removeProgressBar(): void {
  const progressBar = document.getElementById('lta-progress-bar');
  if (progressBar) {
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBar.remove();
    }, 500);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
